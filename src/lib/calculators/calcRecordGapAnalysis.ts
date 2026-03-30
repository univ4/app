export type RecordGapTargetUnivType = "science" | "liberal" | "any";

export type RecordGapStatus = "good" | "warning" | "critical";

export interface RecordGapSubjectNoteInput {
  subjectName: string;
  note: string;
  grade: number;
}

export interface RecordGapActivityInput {
  activityType: string;
  hours: number;
  content: string;
  grade: number;
}

export interface RecordGapAwardInput {
  awardName: string;
  grade: number;
}

export interface RecordGapBehaviorInput {
  content: string;
  grade: number;
}

export interface RecordGapItem {
  section: string;
  status: RecordGapStatus;
  currentLength: number;
  minLength: number;
  message: string;
}

export interface CalcRecordGapAnalysisParams {
  subjectNotes: RecordGapSubjectNoteInput[];
  activities: RecordGapActivityInput[];
  awards: RecordGapAwardInput[];
  behavior: RecordGapBehaviorInput[];
  targetUnivType?: RecordGapTargetUnivType;
}

export interface CalcRecordGapAnalysisResult {
  items: RecordGapItem[];
  overallScore: number;
  criticalCount: number;
}

const ACTIVITY_TYPES_ORDER = ["자율활동", "동아리활동", "진로활동"] as const;

const ACTIVITY_LABELS: Record<(typeof ACTIVITY_TYPES_ORDER)[number], string> = {
  자율활동: "창체 (자율)",
  동아리활동: "창체 (동아리)",
  진로활동: "창체 (진로)",
};

function charLen(s: string): number {
  return s.trim().length;
}

function classifySubjectNote(note: string): {
  status: RecordGapStatus;
  message: string;
  currentLength: number;
} {
  const len = charLen(note);
  if (len === 0) {
    return { status: "critical", message: "치명적 공백: 세특 미입력", currentLength: 0 };
  }
  if (len < 200) {
    return {
      status: "warning",
      message: "보완 권장: 200자 미만",
      currentLength: len,
    };
  }
  if (len < 500) {
    return {
      status: "warning",
      message: "보완 권장: 500자 미만",
      currentLength: len,
    };
  }
  return { status: "good", message: "양호", currentLength: len };
}

function classifyActivity(totalContentLen: number): {
  status: RecordGapStatus;
  message: string;
} {
  if (totalContentLen === 0) {
    return { status: "critical", message: "치명적 공백: 창체 특기사항 미입력" };
  }
  if (totalContentLen < 100) {
    return { status: "warning", message: "보완 권장: 100자 미만" };
  }
  if (totalContentLen < 200) {
    return { status: "warning", message: "보완 권장: 200자 미만" };
  }
  return { status: "good", message: "양호" };
}

function classifyBehavior(content: string): {
  status: RecordGapStatus;
  message: string;
  currentLength: number;
} {
  const len = charLen(content);
  if (len === 0) {
    return { status: "critical", message: "치명적 공백: 행동특성 미입력", currentLength: 0 };
  }
  if (len < 100) {
    return { status: "warning", message: "보완 권장: 100자 미만", currentLength: len };
  }
  if (len < 300) {
    return { status: "warning", message: "보완 권장: 300자 미만", currentLength: len };
  }
  return { status: "good", message: "양호", currentLength: len };
}

function classifyAwards(count: number): {
  status: RecordGapStatus;
  message: string;
} {
  if (count === 0) {
    return { status: "critical", message: "치명적 공백: 수상경력 없음" };
  }
  return { status: "good", message: "양호" };
}

function statusScore(status: RecordGapStatus): number {
  switch (status) {
    case "good":
      return 100;
    case "warning":
      return 55;
    case "critical":
      return 15;
  }
  const _exhaustive: never = status;
  return _exhaustive;
}

function minLengthForItem(kind: "subject" | "activity" | "behavior" | "award"): number {
  if (kind === "award") return 1;
  if (kind === "subject") return 500;
  if (kind === "activity") return 200;
  return 300;
}

/**
 * 생기부(세특·창체·수상·행동특성) 공백·글자수 기준 점검 (P1-14, 매뉴얼 §14).
 */
export function calcRecordGapAnalysis(
  params: CalcRecordGapAnalysisParams,
): CalcRecordGapAnalysisResult {
  void params.targetUnivType;
  const { subjectNotes, activities, awards, behavior } = params;

  const items: RecordGapItem[] = [];

  for (const row of subjectNotes) {
    const { status, message, currentLength } = classifySubjectNote(row.note);
    const section = `세특 (${row.subjectName})`;
    items.push({
      section,
      status,
      currentLength,
      minLength: minLengthForItem("subject"),
      message,
    });
  }

  for (const type of ACTIVITY_TYPES_ORDER) {
    const combined = activities
      .filter((a) => a.activityType === type)
      .map((a) => a.content)
      .join("\n");
    const len = charLen(combined);
    const { status, message } = classifyActivity(len);
    const label = ACTIVITY_LABELS[type];
    items.push({
      section: label,
      status,
      currentLength: len,
      minLength: minLengthForItem("activity"),
      message,
    });
  }

  const awardCount = awards.filter((a) => charLen(a.awardName) > 0).length;
  const awardClass = classifyAwards(awardCount);
  items.push({
    section: "수상경력",
    status: awardClass.status,
    currentLength: awardCount,
    minLength: minLengthForItem("award"),
    message: awardClass.message,
  });

  if (behavior.length === 0) {
    items.push({
      section: "행동특성",
      status: "critical",
      currentLength: 0,
      minLength: minLengthForItem("behavior"),
      message: "치명적 공백: 행동특성 미입력",
    });
  } else {
    for (const b of behavior) {
      const { status, message, currentLength } = classifyBehavior(b.content);
      const section = `행동특성 (${b.grade}학년)`;
      items.push({
        section,
        status,
        currentLength,
        minLength: minLengthForItem("behavior"),
        message,
      });
    }
  }

  const criticalCount = items.filter((i) => i.status === "critical").length;

  const overallScore =
    items.length === 0
      ? 100
      : Math.round(
          items.reduce((sum, i) => sum + statusScore(i.status), 0) / items.length,
        );

  return { items, overallScore, criticalCount };
}

/** PRD·아키텍처 문서상 명칭과의 별칭 */
export const detectGibupGap = calcRecordGapAnalysis;
