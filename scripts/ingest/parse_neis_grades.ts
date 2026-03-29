/**
 * 나이스(NEIS) 성적표 PNG → Claude Vision → academic_records 적재용 JSON
 *
 * 입력: `record/{학기}_pN.png` (학기당 여러 페이지, 없는 파일은 건너뜀)
 * 출력: `record/parsed/{1-1,1-2,2-1}.json`
 *
 * 스키마: `subject_name`·`raw_score` 중심으로 정규화(OCR 누락 시 null).
 *
 * 환경: `ANTHROPIC_API_KEY` 필수 (실행 전 `set -a; source .env.local; set +a` 등)
 *
 * 실행: ./node_modules/.bin/tsx scripts/ingest/parse_neis_grades.ts
 */

import { access, constants, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const RECORD_DIR = path.join(process.cwd(), "record");
const PARSED_DIR = path.join(RECORD_DIR, "parsed");

/** 학기별 예상 페이지 파일명 — `record/`에 없으면 해당 파일만 skip */
const SEMESTERS: { semester: string; pages: string[] }[] = [
  { semester: "1-1", pages: ["1-1_p1.png", "1-1_p2.png"] },
  { semester: "1-2", pages: ["1-2_p1.png", "1-2_p2.png"] },
  { semester: "2-1", pages: ["2-1_p1.png", "2-1_p2.png", "2-1_p3.png"] },
];

const VISION_PROMPT = `이 이미지는 대한민국 고등학교 나이스(NEIS) 성적표입니다.

표 구조:
- 보통교과: 과목명(단위수) 셀이 병합. 원점수/성취도/석차등급/석차/과목평균(표준편차)은 과목당 1회만 표시
- 진로선택과목: 원점수/과목평균, 성취도(수강자수), 성취도별 분포비율 구조
- 체육·예술과목: 원점수, 성취도만 있고 석차등급 없음

추출 규칙:
- 과목명: "국어(4)" → subject_name="국어", unit=4
- 원점수: 합계 열의 값 (raw_score)
- 석차: "24(2)/270" → rank=24, rank_total=270 (동석차수 괄호 안 숫자는 무시)
- "/270" 형태면 rank=null, rank_total=270
- 과목평균(표준편차): "74.5(12.3)" → class_avg=74.5, std_dev=12.3
- 석차등급 없는 과목(진로선택, 체육, 예술)은 grade=null
- 성취도: A/B/C/D/E 또는 null
- 조회된 목록이 없습니다 섹션은 건너뜀
- 성취율 급간 정보 표는 무시

JSON 배열로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
[{"subject_name": "과목명", "unit": 단위수, "raw_score": 원점수, "class_avg": 평균또는null, "std_dev": 표준편차또는null, "student_count": 수강자수또는null, "rank": 석차또는null, "rank_total": 전체인원또는null, "grade": 석차등급또는null, "achievement": "성취도또는null"}]`;

/** 스크립트가 파일명으로 semester를 강제하므로 저장 시 이 값만 사용한다 */
type SubjectRow = {
  subject_name: string;
  /** 필수 검증: 유한 number 또는 null(OCR 누락·오인식 시 null) */
  raw_score: number | null;
  unit: number | null;
  class_avg: number | null;
  std_dev: number | null;
  student_count: number | null;
  rank: number | null;
  rank_total: number | null;
  grade: number | null;
  achievement: string | null;
};

type ParsedPayload = {
  semester: string;
  subjects: SubjectRow[];
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as Record<string, unknown>).content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type === "text" && typeof b.text === "string") {
      parts.push(b.text);
    }
  }
  return parts.join("\n").trim();
}

/** 코드펜스 제거 후 최상위 JSON 배열 `[...]` 또는 객체 `{...}` 문자열 추출 */
function sliceJsonPayload(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```/m.exec(t);
  const body = (fence?.[1] ?? t).trim();
  if (body.startsWith("[")) {
    const start = body.indexOf("[");
    const end = body.lastIndexOf("]");
    if (start >= 0 && end > start) return body.slice(start, end + 1);
  }
  if (body.startsWith("{")) {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) return body.slice(start, end + 1);
  }
  return body;
}

/** 숫자 필드: 유한한 number만 유지, 그 외·누락은 null */
function nullableFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function nullableAchievement(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return null;
}

function normalizeSubjectRow(x: unknown): SubjectRow | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.subject_name !== "string") return null;
  const raw_score = nullableFiniteNumber(o.raw_score);
  return {
    subject_name: o.subject_name,
    raw_score,
    unit: nullableFiniteNumber(o.unit),
    class_avg: nullableFiniteNumber(o.class_avg),
    std_dev: nullableFiniteNumber(o.std_dev),
    student_count: nullableFiniteNumber(o.student_count),
    rank: nullableFiniteNumber(o.rank),
    rank_total: nullableFiniteNumber(o.rank_total),
    grade: nullableFiniteNumber(o.grade),
    achievement: nullableAchievement(o.achievement),
  };
}

/** Claude 응답 루트는 JSON 배열(과목 행들) */
function parseSubjectArrayFromRoot(x: unknown): SubjectRow[] | null {
  if (!Array.isArray(x)) return null;
  const out: SubjectRow[] = [];
  for (const item of x) {
    const row = normalizeSubjectRow(item);
    if (row) out.push(row);
  }
  return out;
}

function subjectUnitDedupeKey(row: SubjectRow): string {
  const name = row.subject_name.trim().replace(/\s+/g, " ");
  const u = row.unit === null ? "\0null" : String(row.unit);
  return `${name}\0${u}`;
}

/** 페이지 순서대로 이어붙인 뒤, subject_name+unit이 같으면 먼저 온 행만 유지 */
function mergeSubjectsDedupeBySubjectAndUnit(rows: SubjectRow[]): SubjectRow[] {
  const seen = new Set<string>();
  const out: SubjectRow[] = [];
  for (const row of rows) {
    const k = subjectUnitDedupeKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

async function callClaudeVisionSafe(
  apiKey: string,
  pngBuffer: Buffer,
): Promise<{ ok: true; text: string } | { ok: false; err: string }> {
  try {
    const text = await callClaudeVision(apiKey, pngBuffer.toString("base64"));
    return { ok: true, text };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, err };
  }
}

async function subjectsFromAssistantText(
  assistantText: string,
  rawBaseName: string,
): Promise<SubjectRow[]> {
  const jsonStr = sliceJsonPayload(assistantText);
  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    const rawPath = path.join(PARSED_DIR, `${rawBaseName}.raw.txt`);
    await writeFile(rawPath, assistantText, "utf8");
    console.error(`[${rawBaseName}] JSON 파싱 실패 — 원문 저장: ${rawPath}`);
    return [];
  }
  const subjects = parseSubjectArrayFromRoot(data);
  if (subjects === null) {
    const rawPath = path.join(PARSED_DIR, `${rawBaseName}.raw.txt`);
    await writeFile(rawPath, assistantText, "utf8");
    console.error(
      `[${rawBaseName}] 스키마 검증 실패(최상위 JSON 배열 아님) — 원문 저장: ${rawPath}`,
    );
    return [];
  }
  return subjects;
}

async function callClaudeVision(
  apiKey: string,
  base64Png: string,
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Png,
              },
            },
            { type: "text", text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });

  const rawBody = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic HTTP ${res.status}: ${rawBody.slice(0, 1200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error(`Anthropic 응답 JSON 파싱 실패: ${rawBody.slice(0, 500)}`);
  }

  const text = extractAssistantText(parsed);
  if (!text) {
    throw new Error(
      `Anthropic 응답에 텍스트 블록이 없습니다: ${rawBody.slice(0, 500)}`,
    );
  }
  return text;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 가 설정되지 않았습니다. 종료합니다.");
    process.exit(1);
  }

  await mkdir(PARSED_DIR, { recursive: true });

  const counts: { semester: string; subjects: number; ok: boolean }[] = [];

  for (const { semester, pages } of SEMESTERS) {
    const existingPaths: { full: string; png: string; stem: string }[] = [];
    for (const png of pages) {
      const full = path.join(RECORD_DIR, png);
      if (await pathExists(full)) {
        existingPaths.push({
          full,
          png,
          stem: path.basename(png, path.extname(png)),
        });
      } else {
        console.log(`[${semester}] skip (없음): ${png}`);
      }
    }

    if (existingPaths.length === 0) {
      console.log(`[${semester}] 처리할 PNG 없음 — 건너뜀`);
      counts.push({ semester, subjects: 0, ok: false });
      continue;
    }

    const mergedInPageOrder: SubjectRow[] = [];
    let anyVisionOk = false;

    for (const { full, stem } of existingPaths) {
      const rawBaseName = `${semester}_${stem}`;
      let buf: Buffer;
      try {
        buf = await readFile(full);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${semester}] 읽기 실패 ${full}: ${msg}`);
        continue;
      }

      const r = await callClaudeVisionSafe(apiKey, buf);
      if (!r.ok) {
        console.error(`[${semester}] Vision 실패 (${stem}): ${r.err}`);
        continue;
      }
      anyVisionOk = true;
      const pageSubjects = await subjectsFromAssistantText(r.text, rawBaseName);
      mergedInPageOrder.push(...pageSubjects);
    }

    if (!anyVisionOk) {
      console.error(`[${semester}] Vision 성공한 페이지 없음`);
      counts.push({ semester, subjects: 0, ok: false });
      continue;
    }

    const subjects = mergeSubjectsDedupeBySubjectAndUnit(mergedInPageOrder);
    const out: ParsedPayload = { semester, subjects };

    const outPath = path.join(PARSED_DIR, `${semester}.json`);
    await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
    const n = out.subjects.length;
    console.log(`[${semester}] 저장 완료: ${outPath} (과목 ${n}개)`);
    counts.push({ semester, subjects: n, ok: true });
  }

  console.log("\n--- 학기별 총 과목 수 ---");
  for (const c of counts) {
    console.log(`${c.semester}: ${c.ok ? `${c.subjects}개` : "실패/스킵"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
