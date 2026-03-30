import { extractAnthropicMessageText } from "@/lib/chat/jeongsiGunAnthropic";

describe("extractAnthropicMessageText", () => {
  it("텍스트 블록을 이어붙인다", () => {
    const t = extractAnthropicMessageText({
      content: [
        { type: "text", text: "안녕 " },
        { type: "text", text: "세상" },
      ],
    });
    expect(t).toBe("안녕 세상");
  });

  it("형식이 맞지 않으면 null", () => {
    expect(extractAnthropicMessageText(null)).toBeNull();
    expect(extractAnthropicMessageText({})).toBeNull();
    expect(extractAnthropicMessageText({ content: "x" })).toBeNull();
  });
});
