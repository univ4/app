import { parseResearchTopicsFromMarkdown } from "@/lib/chat/researchTopics";

describe("parseResearchTopicsFromMarkdown", () => {
  it("### 블록과 불릿에서 필드를 추출한다", () => {
    const md = `## 탐구 주제 추천

### 1. [RL 회로 실험]
- 연계 교과: 물리학Ⅱ
- 난이도: 중
- 소요시간: 3주
- 탐구 방향: OPAMP 특성 측정
- 목표 대학 연계점: 학업 역량`;

    const topics = parseResearchTopicsFromMarkdown(md);
    expect(topics).toHaveLength(1);
    expect(topics[0]!.title).toBe("RL 회로 실험");
    expect(topics[0]!.linkedSubject).toBe("물리학Ⅱ");
    expect(topics[0]!.difficulty).toBe("중");
    expect(topics[0]!.durationLabel).toBe("3주");
    expect(topics[0]!.direction).toBe("OPAMP 특성 측정");
    expect(topics[0]!.univLink).toBe("학업 역량");
  });

  it("여러 주제를 구분한다", () => {
    const md = `### 1. A주제
- 난이도: 하
- 소요시간: 1주
### 2. B주제
- 난이도: 상
- 소요시간: 6주`;

    const topics = parseResearchTopicsFromMarkdown(md);
    expect(topics.length).toBeGreaterThanOrEqual(2);
    expect(topics.some((t) => t.title.includes("A주제"))).toBe(true);
    expect(topics.some((t) => t.title.includes("B주제"))).toBe(true);
  });
});
