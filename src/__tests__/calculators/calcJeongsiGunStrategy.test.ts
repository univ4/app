import {
  calcJeongsiGunStrategy,
  type JeongsiGunCard,
} from "@/lib/calculators/calcJeongsiGunStrategy";

function card(university: string, signal: "safe" | "moderate" | "challenge"): JeongsiGunCard {
  return { university, signal };
}

describe("calcJeongsiGunStrategy", () => {
  it("3개 모두 challenge이면 danger·안전망 없음 경고", () => {
    const r = calcJeongsiGunStrategy({
      gaCard: card("A", "challenge"),
      naCard: card("B", "challenge"),
      daCard: card("C", "challenge"),
    });
    expect(r.riskLevel).toBe("danger");
    expect(r.safeNetExists).toBe(false);
    expect(r.warnings.some((w) => w.includes("도전권"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("안전망 없음"))).toBe(true);
  });

  it("안정 1개 이상이면 safe 등급(3개 모두 도전이 아님)", () => {
    const r = calcJeongsiGunStrategy({
      gaCard: card("A", "safe"),
      naCard: card("B", "challenge"),
      daCard: card("C", "challenge"),
    });
    expect(r.riskLevel).toBe("safe");
    expect(r.safeNetExists).toBe(true);
    expect(r.warnings.some((w) => w.includes("안전망 없음"))).toBe(false);
  });

  it("안정 0개·일부 선택 시 안전망 없음 경고", () => {
    const r = calcJeongsiGunStrategy({
      gaCard: card("A", "moderate"),
      naCard: card("B", "challenge"),
      daCard: null,
    });
    expect(r.safeNetExists).toBe(false);
    expect(r.warnings).toContain("안전망 없음 경고 ⚠️");
    expect(r.riskLevel).toBe("moderate");
  });

  it("null 카드만 있으면 moderate·경고 없음·안내 recommendation", () => {
    const r = calcJeongsiGunStrategy({
      gaCard: null,
      naCard: null,
      daCard: null,
    });
    expect(r.riskLevel).toBe("moderate");
    expect(r.safeNetExists).toBe(false);
    expect(r.warnings).toEqual([]);
    expect(r.recommendation).toContain("각각 선택");
  });

  it("동일 대학 2개 이상이면 중복 경고", () => {
    const r = calcJeongsiGunStrategy({
      gaCard: card("서강대", "moderate"),
      naCard: card("서강대", "moderate"),
      daCard: null,
    });
    expect(r.warnings).toContain("동일 대학 중복 지원 확인");
  });
});
