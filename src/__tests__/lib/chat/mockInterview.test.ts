import {
  parseMockInterviewQuestionBlocks,
} from "@/lib/chat/mockInterview";

describe("parseMockInterviewQuestionBlocks", () => {
  it("### Qn 블록으로 분리한다", () => {
    const md = `## 면접 질문 목록

### Q1. 첫 질문
- 유형: 인성

### Q2. 두 번째
- 유형: 전공적합성`;

    const blocks = parseMockInterviewQuestionBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("Q1.");
    expect(blocks[1]).toContain("Q2.");
  });

  it("질문 블록이 없으면 빈 배열", () => {
    expect(parseMockInterviewQuestionBlocks("서론만 있음")).toHaveLength(0);
  });
});
