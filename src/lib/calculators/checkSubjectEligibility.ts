import { SUBJECT_YEAR, type SubjectProfile, type UnivSubjectRequirement } from "@/types/subject";

function normalize(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length > 0 ? t : null;
}

/** 탐구·사회 슬롯에 적힌 과목명(공백 제거, 빈 값 제외) */
export function collectInquirySubjectNames(profile: SubjectProfile): string[] {
  const raw = [
    profile.science1,
    profile.science2,
    profile.social1,
    profile.social2,
  ];
  const out: string[] = [];
  for (const r of raw) {
    const n = normalize(r);
    if (n) out.push(n);
  }
  return out;
}

/** 수학·국어·탐구·제2외국어 등 지원 판정에 쓰이는 전체 과목/유형 문자열 */
export function collectProfileSubjectTokens(profile: SubjectProfile): string[] {
  const tokens = new Set<string>();
  tokens.add(profile.korean_subject);
  tokens.add(profile.math_subject);
  for (const s of collectInquirySubjectNames(profile)) {
    tokens.add(s);
  }
  const sf = normalize(profile.second_foreign);
  if (sf) tokens.add(sf);
  return [...tokens];
}

function isNonEmptyArray(a: string[] | null | undefined): a is string[] {
  return Array.isArray(a) && a.length > 0;
}

function hasPreferredDefined(pref: Record<string, unknown> | null): boolean {
  if (!pref || typeof pref !== "object") return false;
  const keys = [
    "inquiry_subjects",
    "inquiry",
    "탐구",
    "science_subjects",
    "math_subjects",
    "math",
    "korean_subjects",
    "korean",
  ] as const;
  for (const key of keys) {
    const v = pref[key];
    if (Array.isArray(v) && v.length > 0) return true;
  }
  return false;
}

/**
 * preferred_subjects jsonb 해석 (예시 형태)
 * - { "inquiry_subjects": ["지구과학Ⅰ"], "note": "..." }
 * - { "math_subjects": ["미적분"] }
 * - { "korean_subjects": ["언어와매체"] }
 */
function extractPreferredMessages(
  preferred: Record<string, unknown> | null,
  profile: SubjectProfile,
): string[] {
  const advantages: string[] = [];
  if (!preferred || typeof preferred !== "object") {
    return advantages;
  }

  const inquiries = collectInquirySubjectNames(profile);
  const inquiryKeys = ["inquiry_subjects", "inquiry", "탐구", "science_subjects"] as const;
  for (const key of inquiryKeys) {
    const arr = preferred[key];
    if (!Array.isArray(arr)) continue;
    const wanted = arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    const hit = wanted.some((w) => inquiries.includes(w.trim()));
    if (hit) {
      const note =
        typeof preferred.note === "string"
          ? preferred.note
          : typeof preferred.message === "string"
            ? preferred.message
            : "탐구 과목 우대 조건과 일치합니다.";
      advantages.push(note);
    }
  }

  const mathArr = preferred.math_subjects ?? preferred.math;
  if (Array.isArray(mathArr)) {
    const wanted = mathArr.filter((x): x is string => typeof x === "string");
    if (wanted.map((w) => w.trim()).includes(profile.math_subject)) {
      advantages.push(
        typeof preferred.math_note === "string"
          ? preferred.math_note
          : "수학 과목 우대 조건과 일치합니다.",
      );
    }
  }

  const koreanArr = preferred.korean_subjects ?? preferred.korean;
  if (Array.isArray(koreanArr)) {
    const wanted = koreanArr.filter((x): x is string => typeof x === "string");
    if (wanted.map((w) => w.trim()).includes(profile.korean_subject)) {
      advantages.push(
        typeof preferred.korean_note === "string"
          ? preferred.korean_note
          : "국어 과목 우대 조건과 일치합니다.",
      );
    }
  }

  return [...new Set(advantages)];
}

/**
 * 학생 선택과목 프로필이 특정 대학(학과) 요건을 충족하는지 판정합니다. (Track 1, LLM 없음)
 */
export function checkSubjectEligibility(
  profile: SubjectProfile,
  requirement: UnivSubjectRequirement,
): {
  eligible: boolean;
  warnings: string[];
  advantages: string[];
} {
  if (profile.year !== SUBJECT_YEAR || requirement.year !== SUBJECT_YEAR) {
    throw new Error(
      `ValidationError: year must be ${SUBJECT_YEAR} for subject eligibility checks.`,
    );
  }

  const warnings: string[] = [];
  let eligible = true;

  const tokens = collectProfileSubjectTokens(profile);
  const inquiries = collectInquirySubjectNames(profile);

  if (isNonEmptyArray(requirement.disqualified_subjects)) {
    for (const d of requirement.disqualified_subjects) {
      const label = String(d).trim();
      if (!label) continue;
      if (tokens.includes(label)) {
        eligible = false;
        warnings.push(`지원 불가 과목/유형에 해당합니다: ${label}`);
      }
    }
  }

  if (isNonEmptyArray(requirement.required_math)) {
    const allowed = requirement.required_math.map((m) => String(m).trim()).filter(Boolean);
    if (allowed.length > 0 && !allowed.includes(profile.math_subject)) {
      eligible = false;
      warnings.push(
        `필수 수학 과목 조건을 충족하지 않습니다. 허용: ${allowed.join(", ")} / 선택: ${profile.math_subject}`,
      );
    }
  }

  if (isNonEmptyArray(requirement.required_science)) {
    const needed = requirement.required_science.map((s) => String(s).trim()).filter(Boolean);
    for (const subj of needed) {
      if (!inquiries.includes(subj)) {
        eligible = false;
        warnings.push(
          `필수 탐구 과목이 누락되었습니다. 필요: ${subj} / 현재 탐구: ${inquiries.length ? inquiries.join(", ") : "(없음)"}`,
        );
      }
    }
  }

  const advantages =
    eligible ? extractPreferredMessages(requirement.preferred_subjects, profile) : [];

  if (requirement.notes && requirement.notes.trim() && !eligible) {
    warnings.push(`요강 참고: ${requirement.notes.trim()}`);
  }

  if (
    eligible &&
    hasPreferredDefined(requirement.preferred_subjects) &&
    advantages.length === 0
  ) {
    warnings.push(
      "우대·가산 조건은 있으나 현재 선택과목 조합과 일치하는 항목이 없습니다.",
    );
  }

  return { eligible, warnings, advantages };
}
