import {
  getChatSimilarityThreshold,
  getGuidelineMatchParams,
} from "@/lib/chat/ragChat";

describe("ragChat RAG params", () => {
  const origThreshold = process.env.CHAT_SIMILARITY_THRESHOLD;

  afterEach(() => {
    if (origThreshold === undefined) {
      delete process.env.CHAT_SIMILARITY_THRESHOLD;
    } else {
      process.env.CHAT_SIMILARITY_THRESHOLD = origThreshold;
    }
  });

  describe("getChatSimilarityThreshold", () => {
    it("defaults to 0.55 when unset", () => {
      delete process.env.CHAT_SIMILARITY_THRESHOLD;
      expect(getChatSimilarityThreshold()).toBe(0.55);
    });

    it("parses env and falls back to 0.55 on invalid", () => {
      process.env.CHAT_SIMILARITY_THRESHOLD = "0.62";
      expect(getChatSimilarityThreshold()).toBe(0.62);
      process.env.CHAT_SIMILARITY_THRESHOLD = "nan";
      expect(getChatSimilarityThreshold()).toBe(0.55);
      process.env.CHAT_SIMILARITY_THRESHOLD = "2";
      expect(getChatSimilarityThreshold()).toBe(0.55);
    });
  });

  describe("getGuidelineMatchParams", () => {
    it("no univ scope: match_count 5, no univ_name in filter", () => {
      expect(getGuidelineMatchParams(undefined, undefined)).toEqual({
        match_count: 5,
        filter: {},
      });
      expect(getGuidelineMatchParams("  ", undefined)).toEqual({
        match_count: 5,
        filter: {},
      });
    });

    it("year only: match_count 5", () => {
      expect(getGuidelineMatchParams(undefined, 2027)).toEqual({
        match_count: 5,
        filter: { year: 2027 },
      });
    });

    it("univ scope: match_count 10 and univ_name in filter", () => {
      expect(getGuidelineMatchParams("서강대", 2027)).toEqual({
        match_count: 10,
        filter: { univ_name: "서강대", year: 2027 },
      });
      expect(getGuidelineMatchParams("  한양대  ", undefined)).toEqual({
        match_count: 10,
        filter: { univ_name: "한양대" },
      });
    });
  });
});
