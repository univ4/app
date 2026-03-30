import {
  buildPersonalStatementSystemPrompt,
  buildPersonalStatementUserMessage,
  parsePersonalStatementSections,
} from "@/lib/chat/personalStatementFeedback";

describe("personalStatementFeedback", () => {
  it("buildPersonalStatementSystemPrompt에 글자수와 생기부 컨텍스트가 포함된다", () => {
    const s = buildPersonalStatementSystemPrompt("본문", 1500);
    expect(s).toContain("1500");
    expect(s).toContain("본문");
    expect(s).toContain("문장 대필 금지");
  });

  it("parsePersonalStatementSections가 ## 제목 기준으로 섹션을 분리한다", () => {
    const text = `## 글자수 확인
ok

## 학업역량 관련 피드백
a

## 개선 제안
b`;
    const sections = parsePersonalStatementSections(text);
    const keys = sections.map((x) => x.key);
    expect(keys).toContain("char_count");
    expect(keys).toContain("academic");
    expect(keys).toContain("suggestions");
  });

  it("buildPersonalStatementUserMessage에 문항·초안이 포함된다", () => {
    const u = buildPersonalStatementUserMessage({
      targetUniv: "서강대",
      statementUniversity: "서강대",
      questionNumber: 1,
      questionText: "Q",
      draftText: "D",
    });
    expect(u).toContain("서강대");
    expect(u).toContain("Q");
    expect(u).toContain("D");
  });
});
