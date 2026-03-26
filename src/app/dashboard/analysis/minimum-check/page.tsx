import { redirect } from "next/navigation";

import { MinimumCheckClient } from "@/components/analysis/MinimumCheckClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type SuneungGrades,
  type SuneungMinimumRule,
} from "@/lib/calculators/checkSuneungMinimum";
import { createClient } from "@/lib/supabase/server";

type RuleRow = {
  university_name: string;
  admission_type: string;
  suneung_minimum: {
    condition?: string;
    subjects?: string[];
    english_limit?: number | null;
    major_group?: string;
  } | null;
};

export default async function MinimumCheckPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: latestMock } = await supabase
    .from("academic_records")
    .select("korean_grade, math_grade, english_grade, sci1_grade, sci2_grade")
    .eq("student_id", user.id)
    .eq("record_type", "MOCK_EXAM")
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestMock) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>수능최저 충족 분석</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            먼저 모의고사 성적을 입력해주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  const initialGrades: SuneungGrades = {
    korean: Number(latestMock.korean_grade ?? 9),
    math: Number(latestMock.math_grade ?? 9),
    english: Number(latestMock.english_grade ?? 9),
    sci1: Number(latestMock.sci1_grade ?? 9),
    sci2: Number(latestMock.sci2_grade ?? 9),
  };

  const { data: rules } = await supabase
    .from("susi_gpa_rules")
    .select("university_name, admission_type, suneung_minimum")
    .not("suneung_minimum", "is", null);

  const entries = ((rules ?? []) as RuleRow[])
    .map((row) => {
      const min = row.suneung_minimum ?? {};
      const rule: SuneungMinimumRule = {
        condition: String(min.condition ?? ""),
        subjects: Array.isArray(min.subjects) ? min.subjects.map(String) : [],
        english_limit:
          typeof min.english_limit === "number" ? min.english_limit : null,
      };

      if (!rule.condition || rule.subjects.length === 0) return null;

      return {
        university: row.university_name,
        admission_type: row.admission_type,
        major_group: String(min.major_group ?? "자연계열"),
        condition: rule.condition,
        rule,
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> =>
        item !== null,
    );

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <MinimumCheckClient initialGrades={initialGrades} entries={entries} />
    </div>
  );
}

