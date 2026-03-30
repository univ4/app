/**
 * calcAdmissionSignal 하드코딩 기준 케이스 검증
 *
 * 실행: ./node_modules/.bin/tsx scripts/validate/validate_signal_accuracy.ts
 */

import { calcAdmissionSignal, type AdmissionSignalTier } from "../../src/lib/calculators/calcAdmissionSignal";

type SignalCase = {
  name: string;
  myScore: number;
  cutoff: number;
  scoreType: "suneung" | "gpa";
  expected: AdmissionSignalTier;
};

export type SignalValidationResult = {
  totalCases: number;
  passedCases: number;
  errorCount: number;
  warnCount: number;
  lines: string[];
};

const CASES: SignalCase[] = [
  {
    name: "서울대 컴퓨터공학부 정시(컷 인접)",
    myScore: 645,
    cutoff: 642,
    scoreType: "suneung",
    expected: "moderate",
  },
  {
    name: "연세대 경영학과 정시(컷 인접)",
    myScore: 628,
    cutoff: 631,
    scoreType: "suneung",
    expected: "moderate",
  },
  {
    name: "정시 컷 +10",
    myScore: 660,
    cutoff: 650,
    scoreType: "suneung",
    expected: "safe",
  },
  {
    name: "정시 컷 -10",
    myScore: 640,
    cutoff: 650,
    scoreType: "suneung",
    expected: "challenge",
  },
  {
    name: "교과전형 컷 1.5, 내 점수 1.2",
    myScore: 1.2,
    cutoff: 1.5,
    scoreType: "gpa",
    expected: "moderate",
  },
  {
    name: "교과전형 컷 1.5, 내 점수 1.8",
    myScore: 1.8,
    cutoff: 1.5,
    scoreType: "gpa",
    expected: "moderate",
  },
  {
    name: "교과전형 컷 1.5, 내 점수 1.1",
    myScore: 1.1,
    cutoff: 1.5,
    scoreType: "gpa",
    expected: "safe",
  },
  {
    name: "교과전형 컷 1.5, 내 점수 1.9",
    myScore: 1.9,
    cutoff: 1.5,
    scoreType: "gpa",
    expected: "challenge",
  },
];

export function validateSignalAccuracy(): SignalValidationResult {
  const failLines: string[] = [];
  let passed = 0;

  for (const testCase of CASES) {
    const actual = calcAdmissionSignal({
      myScore: testCase.myScore,
      cutoff: testCase.cutoff,
      scoreType: testCase.scoreType,
    });

    if (actual.signal === testCase.expected) {
      passed += 1;
      continue;
    }

    failLines.push(
      `[FAIL] ${testCase.name}: 예상 ${testCase.expected}, 실제 ${actual.signal}`,
    );
  }

  const lines = [`[PASS] calcAdmissionSignal 검증: ${passed}/${CASES.length} 케이스 통과`, ...failLines];

  return {
    totalCases: CASES.length,
    passedCases: passed,
    errorCount: CASES.length - passed,
    warnCount: 0,
    lines,
  };
}

function main(): void {
  const result = validateSignalAccuracy();
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.errorCount > 0 ? 1 : 0;
}

const isMain = process.argv[1]?.includes("validate_signal_accuracy");

if (isMain) {
  main();
}
