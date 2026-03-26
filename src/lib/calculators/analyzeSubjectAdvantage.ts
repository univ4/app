import { checkSubjectEligibility } from "@/lib/calculators/checkSubjectEligibility";
import { SUBJECT_YEAR, type SubjectProfile, type University } from "@/types/subject";

/**
 * 목표 대학(요건 포함) 목록을 선택과목 프로필 기준으로 분류합니다. (Track 1, LLM 없음)
 * - ineligible: 지원 자격 없음
 * - disadvantageous: 자격은 있으나 경고(필수·불가 외 조건 등)가 있는 경우
 * - advantageous: 자격 충족 + 우대 조건 일치
 */
export function analyzeSubjectAdvantage(
  profile: SubjectProfile,
  targetUnivs: University[],
): {
  advantageous: University[];
  disadvantageous: University[];
  ineligible: University[];
} {
  if (profile.year !== SUBJECT_YEAR) {
    throw new Error(
      `ValidationError: profile.year must be ${SUBJECT_YEAR} for subject advantage analysis.`,
    );
  }

  const advantageous: University[] = [];
  const disadvantageous: University[] = [];
  const ineligible: University[] = [];

  for (const univ of targetUnivs) {
    const { eligible, warnings, advantages } = checkSubjectEligibility(
      profile,
      univ.requirement,
    );

    if (!eligible) {
      ineligible.push(univ);
      continue;
    }

    if (warnings.length > 0) {
      disadvantageous.push(univ);
      continue;
    }

    if (advantages.length > 0) {
      advantageous.push(univ);
    }
  }

  return { advantageous, disadvantageous, ineligible };
}
