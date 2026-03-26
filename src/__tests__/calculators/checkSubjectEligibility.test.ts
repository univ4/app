import {
  checkSubjectEligibility,
  collectInquirySubjectNames,
  collectProfileSubjectTokens,
} from "@/lib/calculators/checkSubjectEligibility";
import {
  SUBJECT_YEAR,
  type SubjectProfile,
  type UnivSubjectRequirement,
} from "@/types/subject";

function baseProfile(over?: Partial<SubjectProfile>): SubjectProfile {
  return {
    student_id: "00000000-0000-4000-8000-000000000001",
    year: SUBJECT_YEAR,
    korean_subject: "언어와매체",
    math_subject: "미적분",
    science1: "물리학Ⅰ",
    science2: "화학Ⅰ",
    social1: null,
    social2: null,
    second_foreign: null,
    ...over,
  };
}

function baseReq(over?: Partial<UnivSubjectRequirement>): UnivSubjectRequirement {
  return {
    id: "00000000-0000-4000-8000-000000000002",
    univ_id: "00000000-0000-4000-8000-000000000003",
    dept_id: "00000000-0000-4000-8000-000000000004",
    year: SUBJECT_YEAR,
    required_math: null,
    required_science: null,
    preferred_subjects: null,
    disqualified_subjects: null,
    notes: null,
    ...over,
  };
}

describe("checkSubjectEligibility", () => {
  describe("AC: 연도 일치(Track1 입력 검증)", () => {
    it("프로필 year가 SUBJECT_YEAR가 아니면 throw", () => {
      const profile = baseProfile({ year: 2026 as never });
      expect(() =>
        checkSubjectEligibility(profile, baseReq()),
      ).toThrow("ValidationError");
    });

    it("요건 year가 SUBJECT_YEAR가 아니면 throw", () => {
      expect(() =>
        checkSubjectEligibility(
          baseProfile(),
          baseReq({ year: 2026 as never }),
        ),
      ).toThrow("ValidationError");
    });
  });

  describe("AC: 필수 수학(required_math) 충족 판정", () => {
    it("happy: 허용 목록에 현재 수학 포함 시 eligible", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "미적분" }),
        baseReq({ required_math: ["미적분", "기하"] }),
      );
      expect(result.eligible).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("엣지: 미적분만 요구하는데 확률과통계 선택 시 불가 + 경고(SE-01)", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "확률과통계" }),
        baseReq({ required_math: ["미적분"] }),
      );
      expect(result.eligible).toBe(false);
      expect(result.warnings.some((w) => w.includes("필수 수학"))).toBe(true);
    });
  });

  describe("AC: 지원 불가 과목(disqualified_subjects)", () => {
    it("happy: 불가 목록과 겹치지 않으면 통과", () => {
      const result = checkSubjectEligibility(
        baseProfile(),
        baseReq({ disqualified_subjects: ["화법과작문"] }),
      );
      expect(result.eligible).toBe(true);
    });

    it("엣지: 토큰에 불가 과목이 포함되면 eligible=false", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "확률과통계" }),
        baseReq({ disqualified_subjects: ["확률과통계"] }),
      );
      expect(result.eligible).toBe(false);
      expect(result.warnings.some((w) => w.includes("지원 불가"))).toBe(true);
    });
  });

  describe("AC: 필수 탐구(required_science)", () => {
    it("happy: 나열된 탐구가 모두 이수 슬롯에 있으면 통과", () => {
      const result = checkSubjectEligibility(
        baseProfile({ science1: "물리학Ⅰ", science2: "화학Ⅰ" }),
        baseReq({ required_science: ["물리학Ⅰ", "화학Ⅰ"] }),
      );
      expect(result.eligible).toBe(true);
    });

    it("엣지: 필수 탐구 하나라도 없으면 불가", () => {
      const result = checkSubjectEligibility(
        baseProfile({ science1: "물리학Ⅰ", science2: null }),
        baseReq({ required_science: ["물리학Ⅰ", "지구과학Ⅰ"] }),
      );
      expect(result.eligible).toBe(false);
      expect(result.warnings.some((w) => w.includes("필수 탐구"))).toBe(true);
    });

    it("엣지: 탐구 미이수(빈 슬롯)일 때 경고에 (없음) 표시", () => {
      const result = checkSubjectEligibility(
        baseProfile({
          science1: null,
          science2: null,
        }),
        baseReq({ required_science: ["물리학Ⅰ"] }),
      );
      expect(result.eligible).toBe(false);
      expect(result.warnings.some((w) => w.includes("(없음)"))).toBe(true);
    });
  });

  describe("AC: 우대(preferred_subjects) 및 경고", () => {
    it("happy: eligible이면서 탐구 우대 일치 시 advantages에 메시지", () => {
      const result = checkSubjectEligibility(
        baseProfile({ science2: "화학Ⅰ" }),
        baseReq({
          preferred_subjects: {
            inquiry_subjects: ["화학Ⅰ"],
            note: "화학 우대",
          },
        }),
      );
      expect(result.eligible).toBe(true);
      expect(result.advantages).toContain("화학 우대");
    });

    it("엣지: 우대 정의는 있으나 조합 불일치 시 경고(불완전 우대)", () => {
      const result = checkSubjectEligibility(
        baseProfile(),
        baseReq({
          preferred_subjects: { inquiry_subjects: ["지구과학Ⅰ"] },
        }),
      );
      expect(result.eligible).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.includes("우대·가산 조건은 있으나"),
        ),
      ).toBe(true);
    });

    it("ineligible일 때 notes가 있으면 요강 참고 경고 추가", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "확률과통계" }),
        baseReq({
          required_math: ["미적분"],
          notes: "수학 제한 있음",
        }),
      );
      expect(result.eligible).toBe(false);
      expect(result.warnings.some((w) => w.includes("요강 참고"))).toBe(true);
    });
  });

  describe("collectInquirySubjectNames", () => {
    it("과학·사회 슬롯에서 빈 값 제외한 과목명만 수집", () => {
      const names = collectInquirySubjectNames(
        baseProfile({
          science1: "물리학Ⅰ",
          science2: "  ",
          social1: "생활과윤리",
          social2: null,
        }),
      );
      expect(names).toEqual(["물리학Ⅰ", "생활과윤리"]);
    });
  });

  describe("collectProfileSubjectTokens", () => {
    it("국어·수학 선택과 탐구·제2외국어 토큰을 Set 기준으로 수집", () => {
      const tokens = collectProfileSubjectTokens(
        baseProfile({
          korean_subject: "화법과작문",
          math_subject: "기하",
          science1: "생명과학Ⅰ",
          science2: null,
          second_foreign: "프랑스어Ⅰ",
        }),
      );
      expect(tokens).toEqual(
        expect.arrayContaining([
          "화법과작문",
          "기하",
          "생명과학Ⅰ",
          "프랑스어Ⅰ",
        ]),
      );
      expect(tokens.length).toBe(new Set(tokens).size);
    });
  });

  describe("AC: 우대 math / korean 전용 분기", () => {
    it("preferred_subjects에 수학 우대만 있을 때 일치 시 기본 수학 우대 문구", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "미적분" }),
        baseReq({
          preferred_subjects: { math_subjects: ["미적분"] },
        }),
      );
      expect(result.eligible).toBe(true);
      expect(result.advantages).toContain("수학 과목 우대 조건과 일치합니다.");
    });

    it("preferred_subjects 수학 우대에 math_note가 있으면 해당 문구 사용", () => {
      const result = checkSubjectEligibility(
        baseProfile({ math_subject: "미적분" }),
        baseReq({
          preferred_subjects: {
            math_subjects: ["미적분"],
            math_note: "수학 가산 확인",
          },
        }),
      );
      expect(result.advantages).toContain("수학 가산 확인");
    });

    it("preferred_subjects에 국어 우대만 있을 때 일치 시 기본 국어 우대 문구", () => {
      const result = checkSubjectEligibility(
        baseProfile({ korean_subject: "언어와매체" }),
        baseReq({
          preferred_subjects: { korean_subjects: ["언어와매체"] },
        }),
      );
      expect(result.eligible).toBe(true);
      expect(result.advantages).toContain("국어 과목 우대 조건과 일치합니다.");
    });

    it("preferred_subjects 국어 우대에 korean_note가 있으면 해당 문구 사용", () => {
      const result = checkSubjectEligibility(
        baseProfile({ korean_subject: "언어와매체" }),
        baseReq({
          preferred_subjects: {
            korean_subjects: ["언어와매체"],
            korean_note: "국어 우대 확인",
          },
        }),
      );
      expect(result.advantages).toContain("국어 우대 확인");
    });

    it("preferred_subjects에 우대 배열 키가 없으면 hasPreferredDefined false (note만 있는 객체)", () => {
      const result = checkSubjectEligibility(
        baseProfile(),
        baseReq({
          preferred_subjects: { note: "요강 참고용" },
        }),
      );
      expect(result.eligible).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.advantages).toHaveLength(0);
    });
  });
});
