import {
  buildStudentRecordContext,
  parseHakjongSections,
} from "@/lib/chat/hakjongAnalyze";

describe("hakjongAnalyze", () => {
  it("parseHakjongSections: 세 역량 제목으로 분리", () => {
    const text = `## 학업역량
강점
> 근거1

## 진로역량
내용

## 공동체역량
봉사`;

    const sections = parseHakjongSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0]?.key).toBe("academic");
    expect(sections[0]?.content).toContain("근거1");
    expect(sections[1]?.key).toBe("career");
    expect(sections[2]?.key).toBe("community");
  });

  it("buildStudentRecordContext: 청크 나열", () => {
    const ctx = buildStudentRecordContext([
      { id: 1, chunk_text: " A ", metadata: { section: "세특" } },
    ]);
    expect(ctx).toContain("세특");
    expect(ctx).toContain("A");
  });
});
