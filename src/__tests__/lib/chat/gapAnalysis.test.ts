import { parseGapAnalysisSections } from "@/lib/chat/gapAnalysis";

describe("gapAnalysis", () => {
  it("parseGapAnalysisSections는 강점·보완점·액션 플랜 블록을 추출한다", () => {
    const text = `## 강점
수학 세특에 탐구 주제가 명시됨

## 보완점
> 인용 근거

## 액션 플랜 (12주 기준)
- 주제 A (난이도: 중)`;

    const sections = parseGapAnalysisSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0]?.key).toBe("strengths");
    expect(sections[1]?.key).toBe("gaps");
    expect(sections[2]?.key).toBe("actions");
    expect(sections[2]?.title).toContain("액션 플랜");
  });
});
