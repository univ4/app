import { calcAdmissionSignal } from "@/lib/calculators/calcAdmissionSignal";
import { calcAdmissionTrend } from "@/lib/calculators/calcAdmissionTrend";

const hasRealDb = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
const describeIf = hasRealDb ? describe : describe.skip;

describeIf("실DB 통합 테스트 (읽기 전용)", () => {
  test("GET /api/signals - 실제 admission_records 기반 신호등 계산", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: records, error } = await supabase
      .from("admission_records")
      .select("id, cutoff_score, admission_type")
      .eq("admission_type", "정시")
      .not("cutoff_score", "is", null)
      .limit(10);

    expect(error).toBeNull();
    expect(records).not.toBeNull();
    expect(records!.length).toBeGreaterThan(0);

    for (const record of records ?? []) {
      if (!record.cutoff_score) continue;
      const result = calcAdmissionSignal({
        myScore: Number(record.cutoff_score),
        cutoff: Number(record.cutoff_score),
        scoreType: "suneung",
      });
      expect(result.signal).toBe("moderate");
      expect(result.probability).toBe(0.7);
    }
  });

  test("GET /api/trend-analysis - 건국대 연도별 추이", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: records, error } = await supabase
      .from("admission_records")
      .select("year, cutoff_score, competition_ratio")
      .eq("univ_name", "건국대")
      .eq("admission_type", "정시")
      .not("cutoff_score", "is", null)
      .order("year");

    expect(error).toBeNull();
    expect(records).not.toBeNull();

    if (records && records.length >= 2) {
      const trendRecords = records.map((r) => ({
        year: Number(r.year),
        cutoffScore: Number(r.cutoff_score),
        competitionRatio: Number(r.competition_ratio ?? 5),
      }));
      const result = calcAdmissionTrend({ records: trendRecords });
      expect(["up", "down", "stable"]).toContain(result.trend);
      expect(result.latestCutoff).toBeGreaterThan(0);
    }
  });

  test("university_scoring_rules - 주요 대학 규칙 존재 확인", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: rules, error } = await supabase
      .from("university_scoring_rules")
      .select("univ_name")
      .order("univ_name");

    expect(error).toBeNull();
    expect(rules).not.toBeNull();
    expect(rules!.length).toBeGreaterThanOrEqual(10);

    const univNames = rules!.map((r) => r.univ_name);
    expect(univNames).toContain("건국대");
  });

  test("guideline_chunks - 성균관대 청크 존재 확인", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { count, error } = await supabase
      .from("guideline_chunks")
      .select("*", { count: "exact", head: true })
      .eq("metadata->>univ_name", "성균관대");

    expect(error).toBeNull();
    expect((count ?? 0)).toBeGreaterThan(0);
  });
});
