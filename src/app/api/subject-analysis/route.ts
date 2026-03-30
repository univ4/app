import { NextResponse } from "next/server";

import {
  calcSubjectAdvantage,
  mathSubjectChoiceToCalcKey,
  type SubjectAdvantageScoringRow,
} from "@/lib/calculators/calcSubjectAdvantage";
import { checkSubjectEligibility } from "@/lib/calculators/checkSubjectEligibility";
import { ADMISSION_SCAN_UNIVERSE_COUNT } from "@/lib/constants/subjectAnalysis";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  SUBJECT_YEAR,
  type SubjectProfile,
  type UnivSubjectRequirement,
} from "@/types/subject";

type RequirementRow = {
  id: string;
  univ_id: string;
  dept_id: string;
  year: number;
  required_math: string[] | null;
  required_science: string[] | null;
  preferred_subjects: Record<string, unknown> | null;
  disqualified_subjects: string[] | null;
  notes: string | null;
  universities: { name: string } | { name: string }[] | null;
  departments: { name: string } | { name: string }[] | null;
};

function joinName(rel: RequirementRow["universities"]): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) {
    const n = rel[0]?.name;
    return typeof n === "string" ? n : null;
  }
  return typeof rel.name === "string" ? rel.name : null;
}

function joinDeptName(rel: RequirementRow["departments"]): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) {
    const n = rel[0]?.name;
    return typeof n === "string" ? n : null;
  }
  return typeof rel.name === "string" ? rel.name : null;
}

function toRequirement(r: RequirementRow): UnivSubjectRequirement {
  return {
    id: r.id,
    univ_id: r.univ_id,
    dept_id: r.dept_id,
    year: SUBJECT_YEAR,
    required_math: r.required_math,
    required_science: r.required_science,
    preferred_subjects: r.preferred_subjects,
    disqualified_subjects: r.disqualified_subjects,
    notes: r.notes,
  };
}

function profileFromRow(
  studentId: string,
  row: {
    korean_subject: string;
    math_subject: string;
    science1: string | null;
    science2: string | null;
    social1: string | null;
    social2: string | null;
    second_foreign: string | null;
  },
): SubjectProfile {
  return {
    student_id: studentId,
    year: SUBJECT_YEAR,
    korean_subject: row.korean_subject as SubjectProfile["korean_subject"],
    math_subject: row.math_subject as SubjectProfile["math_subject"],
    science1: row.science1,
    science2: row.science2,
    social1: row.social1,
    social2: row.social2,
    second_foreign: row.second_foreign,
  };
}

export async function GET() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  }

  const [{ data: profileRow, error: profileErr }, { data: studentRow }] = await Promise.all([
    supabase.from("subject_profiles").select("*").eq("student_id", user.id).eq("year", SUBJECT_YEAR).maybeSingle(),
    supabase.from("students").select("target_universities").eq("id", user.id).maybeSingle(),
  ]);

  if (profileErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: profileErr.message } },
      { status: 500 },
    );
  }

  const targetUnivs = [...(studentRow?.target_universities ?? [])].filter(Boolean);
  const profile = profileRow ? profileFromRow(user.id, profileRow) : null;

  const emptyEligibility = {
    eligibleUniversityCount: 0,
    totalReferenceUniversities: ADMISSION_SCAN_UNIVERSE_COUNT,
    universitiesWithRequirementData: 0,
    ineligible: [] as {
      universityName: string;
      departmentName: string;
      reasons: string[];
    }[],
  };

  if (!profile) {
    return NextResponse.json({
      data: {
        profile: null,
        eligibility: emptyEligibility,
        advantage: {
          advantageUnivs: [] as string[],
          disadvantageUnivs: [] as string[],
          neutralUnivs: [] as string[],
          summary: "선택과목 프로필을 저장하면 지원 가능 여부와 유불리 분석을 제공합니다.",
        },
      },
      error: null,
    });
  }

  const { data: reqRows, error: reqErr } = await supabase
    .from("univ_subject_requirements")
    .select(
      "id, univ_id, dept_id, year, required_math, required_science, preferred_subjects, disqualified_subjects, notes, universities(name), departments(name)",
    )
    .eq("year", SUBJECT_YEAR);

  if (reqErr) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: reqErr.message } },
      { status: 500 },
    );
  }

  const rows = (reqRows ?? []) as unknown as RequirementRow[];
  const targetsSet = new Set(targetUnivs);
  const filteredRows =
    targetsSet.size > 0
      ? rows.filter((r) => targetsSet.has(joinName(r.universities) ?? ""))
      : [];

  const byUniversity = new Map<string, RequirementRow[]>();
  for (const r of filteredRows) {
    const name = (joinName(r.universities) ?? "").trim();
    if (!name) continue;
    const list = byUniversity.get(name) ?? [];
    list.push(r);
    byUniversity.set(name, list);
  }

  const ineligible: { universityName: string; departmentName: string; reasons: string[] }[] = [];
  const fullyIneligibleUnivNames: string[] = [];
  let eligibleUniversityCount = 0;

  for (const [univName, reqs] of byUniversity) {
    let anyEligible = false;
    for (const r of reqs) {
      const requirement = toRequirement(r);
      const { eligible, warnings } = checkSubjectEligibility(profile, requirement);
      if (eligible) {
        anyEligible = true;
      } else {
        ineligible.push({
          universityName: univName,
          departmentName: joinDeptName(r.departments) ?? "(학과명 없음)",
          reasons: warnings,
        });
      }
    }
    if (anyEligible) eligibleUniversityCount += 1;
    else fullyIneligibleUnivNames.push(univName);
  }

  const scoringRulesRows =
    targetUnivs.length > 0
      ? await supabase
          .from("university_scoring_rules")
          .select("university_name, math_ratio, science_2_bonus, admission_year, major_group")
          .in("university_name", targetUnivs)
          .eq("major_group", "자연계열")
      : { data: [] as Record<string, unknown>[], error: null };

  if (scoringRulesRows.error) {
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: scoringRulesRows.error.message } },
      { status: 500 },
    );
  }

  const latestByUniv = new Map<
    string,
    { math_ratio: number; science_2_bonus: number; admission_year: number }
  >();
  for (const raw of scoringRulesRows.data ?? []) {
    const university_name = String(raw.university_name ?? "");
    const math_ratio = Number(raw.math_ratio);
    const science_2_bonus = Number(raw.science_2_bonus ?? 0);
    const admission_year = Number(raw.admission_year ?? 0);
    if (!university_name || Number.isNaN(math_ratio)) continue;
    const prev = latestByUniv.get(university_name);
    if (!prev || admission_year > prev.admission_year) {
      latestByUniv.set(university_name, { math_ratio, science_2_bonus, admission_year });
    }
  }

  const scoringRules: SubjectAdvantageScoringRow[] = [...latestByUniv.entries()].map(
    ([universityName, v]) => ({
      universityName,
      mathRatio: v.math_ratio,
      science2Bonus: v.science_2_bonus,
    }),
  );

  const sciSubjects = [profile.science1, profile.science2, profile.social1, profile.social2].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );

  const advTargets = targetUnivs.length > 0 ? targetUnivs : [...latestByUniv.keys()];

  const advantage = calcSubjectAdvantage({
    mathSubject: mathSubjectChoiceToCalcKey(profile.math_subject),
    sciSubjects,
    targetUnivs: advTargets,
    scoringRules,
    ineligibleUniversityNames: fullyIneligibleUnivNames,
  });

  return NextResponse.json({
    data: {
      profile: {
        year: profile.year,
        korean_subject: profile.korean_subject,
        math_subject: profile.math_subject,
        science1: profile.science1,
        science2: profile.science2,
        social1: profile.social1,
        social2: profile.social2,
        second_foreign: profile.second_foreign,
      },
      eligibility: {
        eligibleUniversityCount,
        totalReferenceUniversities: ADMISSION_SCAN_UNIVERSE_COUNT,
        universitiesWithRequirementData: byUniversity.size,
        ineligible,
      },
      advantage,
    },
    error: null,
  });
}
