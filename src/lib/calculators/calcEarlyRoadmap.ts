export type EarlyRoadmapGrade = 1 | 2;
export type EarlyRoadmapSemester = 1 | 2;
export type EarlyRoadmapUnivType = "top" | "mid" | "local";
export type EarlyRoadmapDept = "science" | "liberal" | "art";

export interface CalcEarlyRoadmapParams {
  currentGrade: EarlyRoadmapGrade;
  currentSemester: EarlyRoadmapSemester;
  targetUnivType: EarlyRoadmapUnivType;
  targetDept: EarlyRoadmapDept;
}

export interface EarlyRoadmapPhaseRow {
  phase: string;
  period: string;
  priority: string[];
  gpaTarget: string;
  activities: string[];
  warning?: string;
}

export type MilestoneImportance = "critical" | "important" | "optional";

export interface EarlyRoadmapMilestone {
  timing: string;
  milestone: string;
  importance: MilestoneImportance;
}

export interface CalcEarlyRoadmapResult {
  phases: EarlyRoadmapPhaseRow[];
  keyMilestones: EarlyRoadmapMilestone[];
  summary: string;
}

const PHASE_ORDER = ["고1 1학기", "고1 2학기", "고2 1학기", "고2 2학기"] as const;

const PERIOD_BY_PHASE: Record<(typeof PHASE_ORDER)[number], string> = {
  "고1 1학기": "3월 ~ 7월",
  "고1 2학기": "8월 ~ 익년 2월",
  "고2 1학기": "3월 ~ 7월",
  "고2 2학기": "8월 ~ 익년 2월",
};

function gpaForG1S1(univ: EarlyRoadmapUnivType): string {
  if (univ === "top") return "전 과목 평균 1.7등급 이내(상위권 대비)";
  if (univ === "local") return "전 과목 평균 2.5등급 이내(현실적 목표)";
  return "전 과목 2등급 이내";
}

function gpaForG1S2(univ: EarlyRoadmapUnivType): string {
  if (univ === "top") return "주요 과목 평균 1.5등급 이내·1등급 비중 확대";
  if (univ === "local") return "주요 과목 2~3등급 범위에서 안정적 관리";
  return "주요 과목 1~2등급 유지";
}

function gpaForG2S1(univ: EarlyRoadmapUnivType): string {
  if (univ === "top")
    return "목표 상위권 컷 대비 평균 0.3등급 여유를 두고 내신 달성";
  if (univ === "local") return "지역·중위권 대학 컷 기준에 맞춘 현실적 내신 목표";
  return "목표 대학 컷오프 기준 내신 달성";
}

function gpaForG2S2(univ: EarlyRoadmapUnivType): string {
  if (univ === "top") return "2학년 평균 1.5등급대 전후로 마무리·변동 최소화";
  if (univ === "local") return "2학년 내신을 3학년 전략과 연계해 안정적으로 마무리";
  return "2학년 내신 마무리";
}

function extraPriorityTop(phase: (typeof PHASE_ORDER)[number]): string[] {
  if (phase === "고1 1학기") return ["독서·활동 기록의 꾸준한 축적"];
  if (phase === "고1 2학기") return ["영·수 심화 루틴(주당 학습량 점검)"];
  if (phase === "고2 1학기") return ["비교과·세특 근거가 남는 활동 1건 이상"];
  return ["6월·9월 모의고사 결과의 오차 분석"];
}

function extraActivitiesTop(phase: (typeof PHASE_ORDER)[number]): string[] {
  if (phase === "고1 1학기") return ["교내 경시·탐구활동에서 역량 증빙 남기기"];
  if (phase === "고1 2학기") return ["선행 폭보다 개념·문제 유형 안정화 우선"];
  if (phase === "고2 1학기") return ["세특에 남길 탐구·독서를 증빙 자료와 연결"];
  return ["지원 라인별 안전·적정·도전 3단 구성 초안"];
}

function warningForPhase(
  phase: (typeof PHASE_ORDER)[number],
  univ: EarlyRoadmapUnivType,
): string | undefined {
  if (univ === "top" && phase === "고2 2학기") {
    return "상위권 지원은 내신·수능·비교과 균형이 모두 중요합니다. 한 축만 과도하게 기대지 마세요.";
  }
  if (univ === "local" && phase === "고2 1학기") {
    return "지역 거점도 학과·전형별 컷 차이가 큽니다. 최신 모집요강을 함께 확인하세요.";
  }
  if (phase === "고1 2학기") {
    return "선행은 학교 진도·시험 범위와 충돌하지 않게 조절하세요.";
  }
  return undefined;
}

function deptExtras(phase: (typeof PHASE_ORDER)[number], dept: EarlyRoadmapDept): string[] {
  if (dept === "science") {
    if (phase === "고1 1학기") return ["수학·과학 기초 개념 정리 노트 시작"];
    if (phase === "고1 2학기") return ["이공계 진로에 맞는 탐구 주제 후보 2~3개"];
    if (phase === "고2 1학기") return ["과학 탐구보고서·실험·세특 연계"];
    return ["수능 과탐 조합 가설 확정·모의고사 후 수정"];
  }
  if (dept === "liberal") {
    if (phase === "고1 1학기") return ["인문·사회 독서량 확보(감상 한 줄 기록)"];
    if (phase === "고1 2학기") return ["사회·인문 융합 탐구 주제 스케치"];
    if (phase === "고2 1학기") return ["인문 세특·토론·보고서로 역량 정리"];
    return ["어문 영역 정기 모의고사·논술형 대비"];
  }
  return [
    phase === "고1 1학기"
      ? "예술 감상·기초 스케치(또는 악기·발성) 꾸준한 기록"
      : phase === "고1 2학기"
        ? "실기·창작 방향 1차 확정"
        : phase === "고2 1학기"
          ? "포트폴리오·공연·전시 기록 정리"
          : "실기 대비 작품·레퍼토리 마감",
  ];
}

function buildPriorities(
  phase: (typeof PHASE_ORDER)[number],
  univ: EarlyRoadmapUnivType,
): string[] {
  let base: string[];
  switch (phase) {
    case "고1 1학기":
      base = ["내신 관리", "동아리 선택", "세특 기초"];
      break;
    case "고1 2학기":
      base = ["수능 기초 (수학/영어)", "진로 탐색"];
      break;
    case "고2 1학기":
      base = ["수능 선택과목 결정", "학종 스펙 강화"];
      break;
    default:
      base = ["수시 전략 수립", "자소서 소재 발굴"];
  }
  if (univ === "top") {
    return [...base, ...extraPriorityTop(phase)];
  }
  return base;
}

function buildActivities(
  phase: (typeof PHASE_ORDER)[number],
  univ: EarlyRoadmapUnivType,
  dept: EarlyRoadmapDept,
): string[] {
  let base: string[];
  switch (phase) {
    case "고1 1학기":
      base = ["교내 경시대회", "독서 활동 시작"];
      break;
    case "고1 2학기":
      base = ["수학 선행", "진로 관련 탐구 주제 선정"];
      break;
    case "고2 1학기":
      base = ["탐구보고서 작성", "교외 활동 마무리"];
      break;
    default:
      base = ["모의고사 정기 응시", "수시 대학 리스트 초안"];
  }
  const merged = [...base, ...deptExtras(phase, dept)];
  if (univ === "top") {
    merged.push(...extraActivitiesTop(phase));
  }
  return merged;
}

function gpaForPhase(phase: (typeof PHASE_ORDER)[number], univ: EarlyRoadmapUnivType): string {
  switch (phase) {
    case "고1 1학기":
      return gpaForG1S1(univ);
    case "고1 2학기":
      return gpaForG1S2(univ);
    case "고2 1학기":
      return gpaForG2S1(univ);
    default:
      return gpaForG2S2(univ);
  }
}

function univLabel(u: EarlyRoadmapUnivType): string {
  if (u === "top") return "SKY+급 상위권";
  if (u === "mid") return "중상위권";
  return "지역 거점·현실적 라인";
}

function deptLabel(d: EarlyRoadmapDept): string {
  if (d === "science") return "이공계";
  if (d === "liberal") return "인문·사회";
  return "예체능";
}

function univAdjustmentPhrase(u: EarlyRoadmapUnivType): string {
  if (u === "top") return "0.3등급 상향(더 촘촘한 목표)으로 강화";
  if (u === "mid") return "기본값으로 유지";
  return "0.5등급 하향(완화)으로 조정";
}

function currentPhaseLabel(grade: EarlyRoadmapGrade, sem: EarlyRoadmapSemester): string {
  return `고${grade} ${sem}학기`;
}

/** 고1·고2 4학기 조기 설계 로드맵(Track 1, 규칙 기반). 합격을 보장하지 않습니다. */
export function calcEarlyRoadmap(params: CalcEarlyRoadmapParams): CalcEarlyRoadmapResult {
  const { currentGrade, currentSemester, targetUnivType, targetDept } = params;

  const phases: EarlyRoadmapPhaseRow[] = PHASE_ORDER.map((phase) => ({
    phase,
    period: PERIOD_BY_PHASE[phase],
    priority: buildPriorities(phase, targetUnivType),
    gpaTarget: gpaForPhase(phase, targetUnivType),
    activities: buildActivities(phase, targetUnivType, targetDept),
    warning: warningForPhase(phase, targetUnivType),
  }));

  const keyMilestones: EarlyRoadmapMilestone[] = [
    {
      timing: "고1 여름방학 전후",
      milestone: "진로 방향·적성 1차 정리(학과 후보군)",
      importance: "important",
    },
    {
      timing: "고2 초",
      milestone: "수능 선택과목(탐구·가택) 방향 확정",
      importance: "critical",
    },
    {
      timing: "고2 1학기",
      milestone: "탐구보고서·세특에 남길 활동 마감",
      importance: "critical",
    },
    {
      timing: "고2 여름 ~ 가을",
      milestone: "모의고사 추이 점검·수시 지원 라인 초안",
      importance: "important",
    },
    {
      timing: "고3 전",
      milestone: "학교 생활기록부 제출·확인 절차(학교 일정)",
      importance: "optional",
    },
  ];

  const summary = [
    `현재 ${currentPhaseLabel(currentGrade, currentSemester)} 기준, ${univLabel(targetUnivType)}·${deptLabel(targetDept)} 목표에 맞춘 4개 학기 로드맵입니다.`,
    `목표 대학 수준에 따라 내신 목표 문구가 ${univAdjustmentPhrase(targetUnivType)}되었습니다.`,
    "대학·학과·전형별 요구가 다르며, 본 결과는 참고용이며 합격을 보장하지 않습니다. 학교 교육과정과 상담 선생님 지침을 우선하세요.",
  ].join(" ");

  return { phases, keyMilestones, summary };
}
