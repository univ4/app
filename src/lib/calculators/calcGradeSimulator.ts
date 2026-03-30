import {
  calcAdmissionSignal,
  type AdmissionSignalTier,
} from "@/lib/calculators/calcAdmissionSignal";

export type GradeSimulatorCurrentSubject = {
  subjectName: string;
  currentGrade: number;
  creditUnit: number;
  semester: string;
};

export type GradeSimulatorTargetGrade = {
  subjectName: string;
  targetGrade: number;
  /** 동일 과목명이 여러 학기에 있을 때만 지정 */
  semester?: string;
};

export type CalcGradeSimulatorParams = {
  currentSubjects: GradeSimulatorCurrentSubject[];
  targetGrades: GradeSimulatorTargetGrade[];
  targetUniv?: string;
  cutoffGrade?: number;
};

export type GradeSimulatorImprovableSubject = {
  subjectName: string;
  creditUnit: number;
  currentGrade: number;
  improvedGrade: number;
  gradeImpact: number;
};

export type CalcGradeSimulatorResult = {
  currentAvgGrade: number;
  simulatedAvgGrade: number;
  gradeChange: number;
  signalChange?: {
    before: AdmissionSignalTier;
    after: AdmissionSignalTier;
  };
  improvableSubjects: GradeSimulatorImprovableSubject[];
};

function assertFinite(n: number, label: string) {
  if (!Number.isFinite(n)) {
    throw new Error(`ValidationError: ${label} must be a finite number.`);
  }
}

function targetForSubject(
  subjectName: string,
  semester: string,
  targets: GradeSimulatorTargetGrade[],
): number | undefined {
  const specific = targets.find(
    (t) =>
      t.subjectName === subjectName &&
      t.semester != null &&
      t.semester === semester,
  );
  if (specific) return specific.targetGrade;
  const general = targets.find(
    (t) => t.subjectName === subjectName && t.semester == null,
  );
  return general?.targetGrade;
}

/**
 * 단위수 가중 평균 내신. PRD P2-5 — 목표 등급 시뮬레이션·신호등 변화(컷오프 입력 시).
 */
export function calcGradeSimulator(
  params: CalcGradeSimulatorParams,
): CalcGradeSimulatorResult {
  const { currentSubjects, targetGrades, cutoffGrade } = params;

  if (!Array.isArray(currentSubjects)) {
    throw new Error("ValidationError: currentSubjects must be an array.");
  }
  if (!Array.isArray(targetGrades)) {
    throw new Error("ValidationError: targetGrades must be an array.");
  }

  if (currentSubjects.length === 0) {
    throw new Error("ValidationError: currentSubjects must not be empty.");
  }

  for (const t of targetGrades) {
    assertFinite(t.targetGrade, "targetGrade");
  }

  if (cutoffGrade != null) {
    assertFinite(cutoffGrade, "cutoffGrade");
  }

  const rows: {
    subjectName: string;
    currentGrade: number;
    creditUnit: number;
    semester: string;
  }[] = [];

  for (const s of currentSubjects) {
    assertFinite(s.currentGrade, "currentGrade");
    assertFinite(s.creditUnit, "creditUnit");
    if (s.creditUnit <= 0) {
      continue;
    }
    rows.push({
      subjectName: String(s.subjectName),
      currentGrade: s.currentGrade,
      creditUnit: s.creditUnit,
      semester: String(s.semester),
    });
  }

  if (rows.length === 0) {
    throw new Error(
      "ValidationError: at least one subject with creditUnit > 0 is required.",
    );
  }

  function weightedAvg(
    getGrade: (r: (typeof rows)[number]) => number,
  ): number {
    let sum = 0;
    let credits = 0;
    for (const r of rows) {
      const g = getGrade(r);
      assertFinite(g, "grade");
      sum += g * r.creditUnit;
      credits += r.creditUnit;
    }
    return Number((sum / credits).toFixed(4));
  }

  const currentAvgGrade = weightedAvg((r) => r.currentGrade);

  const simulatedAvgGrade = weightedAvg((r) => {
    const tg = targetForSubject(r.subjectName, r.semester, targetGrades);
    return tg != null ? tg : r.currentGrade;
  });

  const gradeChange = Number((simulatedAvgGrade - currentAvgGrade).toFixed(4));

  let signalChange: CalcGradeSimulatorResult["signalChange"] | undefined;
  if (cutoffGrade != null && Number.isFinite(cutoffGrade)) {
    const before = calcAdmissionSignal({
      myScore: currentAvgGrade,
      cutoff: cutoffGrade,
      scoreType: "gpa",
    }).signal;
    const after = calcAdmissionSignal({
      myScore: simulatedAvgGrade,
      cutoff: cutoffGrade,
      scoreType: "gpa",
    }).signal;
    signalChange = { before, after };
  }

  const improvableSubjects: GradeSimulatorImprovableSubject[] = [];

  for (const r of rows) {
    const improved =
      targetForSubject(r.subjectName, r.semester, targetGrades) ?? r.currentGrade;
    assertFinite(improved, "improvedGrade");

    const newAvgIfOnlyThis = weightedAvg((row) => {
      if (row.subjectName === r.subjectName && row.semester === r.semester) {
        return improved;
      }
      return row.currentGrade;
    });

    const gradeImpact = Number((currentAvgGrade - newAvgIfOnlyThis).toFixed(4));

    improvableSubjects.push({
      subjectName: r.subjectName,
      creditUnit: r.creditUnit,
      currentGrade: r.currentGrade,
      improvedGrade: improved,
      gradeImpact,
    });
  }

  improvableSubjects.sort((a, b) => {
    if (b.gradeImpact !== a.gradeImpact) return b.gradeImpact - a.gradeImpact;
    return a.subjectName.localeCompare(b.subjectName, "ko");
  });

  return {
    currentAvgGrade,
    simulatedAvgGrade,
    gradeChange,
    signalChange,
    improvableSubjects,
  };
}
