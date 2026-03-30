import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SuneungScores } from "@/lib/calculators/calculateSuneungScore";
import {
  calcJeongsiGunStrategy,
  type JeongsiGunCard,
} from "@/lib/calculators/calcJeongsiGunStrategy";
import { extractAnthropicMessageText } from "@/lib/chat/jeongsiGunAnthropic";
import {
  buildRagSystemPrompt,
  buildReferenceContext,
  embedQuery,
  getChatDailyLimit,
  getChatSimilarityThreshold,
  rowToCitation,
  type CitationPayload,
  type GuidelineMatchRow,
} from "@/lib/chat/ragChat";
import { pickJeongsiSignalForUniv } from "@/lib/jeongsi-gun/pickJeongsiSignalRow";
import { parseSci2IsTypeTwo } from "@/lib/signals/mockExamSci2";
import {
  buildAdmissionSignalRows,
  type BuildAdmissionSignalRowsInput,
  type DbAdmissionRecord,
} from "@/lib/signals/buildAdmissionSignalRows";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const bodySchema = z.object({
  gaUniv: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string()),
  naUniv: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string()),
  daUniv: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string()),
  admissionYear: z.coerce.number().int().min(2020).max(2035).optional(),
  medShift: z.enum(["0", "1"]).optional(),
});

const JEONGSI_CHUNK_FILTER = { source_kind: "jeongsi_material_md" } as const;

type JeongsiGunSlotDetail = {
  university: string;
  signal: AdmissionSignalTier;
  probability_percent: number;
  gap: number;
};

type ResolveGunSlotResult =
  | { error: string }
  | { card: JeongsiGunCard; detail: JeongsiGunSlotDetail | null };

function getThrownMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "JSON 본문이 필요합니다." } },
      { status: 422 },
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "요청 본문을 확인해 주세요." },
      },
      { status: 422 },
    );
  }

  const admissionYear = parsed.data.admissionYear ?? 2026;
  const applyMedShift = parsed.data.medShift === "1";
  const dailyLimit = getChatDailyLimit();

  const { data: quotaRaw, error: quotaErr } = await supabase.rpc("try_consume_chat_quota", {
    p_limit: dailyLimit,
  });

  if (quotaErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: quotaErr.message } },
      { status: 500 },
    );
  }

  const quota = quotaRaw as { ok?: boolean; code?: string } | null;
  if (!quota?.ok) {
    const isLimit = quota?.code === "RATE_LIMIT";
    return NextResponse.json(
      {
        data: null,
        error: {
          code: isLimit ? "RATE_LIMIT" : "INTERNAL_ERROR",
          message: isLimit
            ? `일일 채팅 호출 한도(${dailyLimit}회)에 도달했습니다.`
            : "호출 한도를 확인할 수 없습니다.",
        },
      },
      { status: isLimit ? 429 : 500 },
    );
  }

  const targetStudentId = user.id;

  const [
    { data: admissionRows, error: admErr },
    { data: scoringRows, error: scoreRulesErr },
    { data: susiRows, error: susiErr },
    { data: gpaRows, error: gpaErr },
    { data: latestMock, error: mockErr },
  ] = await Promise.all([
    supabase
      .from("admission_records")
      .select("id, univ_name, dept_name, admission_type, year, cutoff_score, med_shift_coeff")
      .eq("year", admissionYear),
    supabase
      .from("university_scoring_rules")
      .select(
        "university_name, major_group, korean_ratio, math_ratio, english_ratio, science_ratio, science_2_bonus, english_conversion_table",
      )
      .eq("admission_year", admissionYear),
    supabase
      .from("susi_gpa_rules")
      .select("university_name, admission_type, include_subjects, career_choice_conversion")
      .eq("admission_year", admissionYear)
      .in("admission_type", ["학생부교과", "학생부종합"]),
    supabase
      .from("academic_records")
      .select("subject_name, credit_unit, school_grade, achievement_level")
      .eq("student_id", targetStudentId)
      .eq("record_type", "SCHOOL_GPA"),
    supabase
      .from("academic_records")
      .select(
        "exam_date,korean_standard_score,math_standard_score,english_grade,sci1_standard_score,sci2_standard_score,subject_name",
      )
      .eq("student_id", targetStudentId)
      .eq("record_type", "MOCK_EXAM")
      .order("exam_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (admErr || scoreRulesErr || susiErr || gpaErr || mockErr) {
    const msg =
      admErr?.message ??
      scoreRulesErr?.message ??
      susiErr?.message ??
      gpaErr?.message ??
      mockErr?.message ??
      "unknown";
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 },
    );
  }

  let suneungScores: SuneungScores | null = null;
  if (latestMock) {
    const sci2IsTypeTwo = parseSci2IsTypeTwo(latestMock.subject_name);
    suneungScores = {
      korean_standard_score: Number(latestMock.korean_standard_score),
      math_standard_score: Number(latestMock.math_standard_score),
      english_grade: Number(latestMock.english_grade),
      sci1_standard_score: Number(latestMock.sci1_standard_score),
      sci2_standard_score: Number(latestMock.sci2_standard_score),
      sci2_is_type_two: sci2IsTypeTwo,
    };
  }

  const items = buildAdmissionSignalRows({
    admissionRows: (admissionRows ?? []) as DbAdmissionRecord[],
    scoringRules: (scoringRows ?? []) as BuildAdmissionSignalRowsInput["scoringRules"],
    susiRules: (susiRows ?? []) as BuildAdmissionSignalRowsInput["susiRules"],
    schoolGpaRows: gpaRows ?? [],
    suneungScores,
    applyMedShift,
  });

  function resolveSlot(label: string, univ: string): ResolveGunSlotResult {
    if (!univ) {
      return { card: null, detail: null };
    }
    const picked = pickJeongsiSignalForUniv(items, univ);
    if (!picked) {
      return {
        error: `${label}(${univ}): 정시 신호를 계산할 수 없습니다. 모의고사·환산 규칙·입결 데이터를 확인해 주세요.`,
      };
    }
    return {
      card: { university: univ, signal: picked.signal },
      detail: {
        university: univ,
        signal: picked.signal,
        probability_percent: picked.probability_percent,
        gap: picked.gap,
      },
    };
  }

  const ga = resolveSlot("가군", parsed.data.gaUniv);
  const na = resolveSlot("나군", parsed.data.naUniv);
  const da = resolveSlot("다군", parsed.data.daUniv);

  const firstErr =
    ("error" in ga ? ga.error : undefined) ??
    ("error" in na ? na.error : undefined) ??
    ("error" in da ? da.error : undefined);
  if (firstErr) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: firstErr } },
      { status: 422 },
    );
  }

  const gaCard = "error" in ga ? null : ga.card;
  const naCard = "error" in na ? null : na.card;
  const daCard = "error" in da ? null : da.card;
  const gaDetail = "error" in ga ? null : ga.detail;
  const naDetail = "error" in na ? null : na.detail;
  const daDetail = "error" in da ? null : da.detail;

  const strategy = calcJeongsiGunStrategy({
    gaCard,
    naCard,
    daCard,
  });

  const strategyPayload = {
    ...strategy,
    cards: {
      ga: gaDetail,
      na: naDetail,
      da: daDetail,
    },
  };

  const queryText = [
    "정시 가군 나군 다군 지원 조합 중복 패턴 유의사항",
    parsed.data.gaUniv || "가군미선택",
    parsed.data.naUniv || "나군미선택",
    parsed.data.daUniv || "다군미선택",
    `위험도:${strategy.riskLevel}`,
    `안전망:${strategy.safeNetExists}`,
  ].join(" ");

  let ragSummary =
    "정시자료 청크 검색 결과가 없어, 서울권·수도권·총론 자료 범위에서 가·나·다군 운영은 수험년도 요강·교육청 안내를 함께 확인하시기 바랍니다.";
  let ragCitations: CitationPayload[] = [];

  try {
    const embedding = await embedQuery(queryText);
    const similarityThreshold = getChatSimilarityThreshold();
    const { data: rows, error: matchErr } = await supabase.rpc("match_guideline_chunks", {
      query_embedding: embedding,
      match_count: 10,
      filter: JEONGSI_CHUNK_FILTER,
      match_threshold: similarityThreshold,
    });

    if (matchErr) {
      ragSummary = `정시자료 검색 오류: ${matchErr.message}`;
    } else {
      const chunks = (rows ?? []) as GuidelineMatchRow[];
      if (chunks.length === 0) {
        ragSummary =
          "유사 정시자료 청크를 찾지 못했습니다. CHAT_SIMILARITY_THRESHOLD를 낮추거나 guideline_chunks 정시자료 적재를 확인해 주세요.";
      } else {
        ragCitations = chunks.map(rowToCitation);
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          ragSummary =
            "정시자료 청크는 조회되었으나 LLM 키가 없어 요약을 생략했습니다. ANTHROPIC_API_KEY를 설정하면 자동 요약이 붙습니다.";
        } else {
          const model =
            process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";
          const refContext = buildReferenceContext(chunks);
          const system = buildRagSystemPrompt(refContext);
          const userContent = [
            `[분석 맥락] 가군: ${parsed.data.gaUniv || "미선택"}, 나군: ${parsed.data.naUniv || "미선택"}, 다군: ${parsed.data.daUniv || "미선택"}`,
            `[Track1 요약] 위험도 ${strategy.riskLevel}, 안전망 존재: ${strategy.safeNetExists}, 경고: ${strategy.warnings.join("; ") || "없음"}`,
            "위 [참고 자료]에 근거해, 가·나·다군 운영·중복 지원 시 유의점을 수험생 관점에서 3~6문장으로 요약하세요. 합격을 보장하거나 특정 대학 지원을 권하지 마세요. 끝에 출처를 표기하세요.",
          ].join("\n");

          const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              max_tokens: 900,
              stream: false,
              system,
              messages: [{ role: "user", content: userContent }],
            }),
          });

          const rawAnthropic: unknown = await anthropicRes.json().catch(() => ({}));
          if (!anthropicRes.ok) {
            const errBody = rawAnthropic && typeof rawAnthropic === "object" ? rawAnthropic : null;
            const errMsg = errBody && "error" in errBody ? (errBody as { error?: { message?: unknown } }).error?.message : undefined;
            const msg = typeof errMsg === "string" ? errMsg : undefined;
            ragSummary = msg || `Anthropic API 오류 (${anthropicRes.status})`;
          } else {
            const text = extractAnthropicMessageText(rawAnthropic);
            if (text) {
              ragSummary = text;
            } else {
              ragSummary = "모델 응답을 파싱하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            }
          }
        }
      }
    }
  } catch (e) {
    ragSummary = `RAG 요약 생성에 실패했습니다: ${getThrownMessage(e)}`;
  }

  return NextResponse.json({
    data: {
      strategy: strategyPayload,
      ragSummary,
      ragCitations,
    },
    error: null,
  });
}
