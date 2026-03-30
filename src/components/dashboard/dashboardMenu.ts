import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BarChart3,
  BarChart2,
  BookOpen,
  Brain,
  Bot,
  Calculator,
  CalendarDays,
  FileText,
  FlaskConical,
  GraduationCap,
  GitCompare,
  LayoutGrid,
  LayoutList,
  Lightbulb,
  Map,
  Mic,
  PenLine,
  RefreshCw,
  Route,
  ScanLine,
  Search,
  TrendingUp,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

export type DashboardLinkItem = {
  href: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
};

export type DashboardMenuSection = {
  title: string;
  items: DashboardLinkItem[];
};

export const DASHBOARD_CORE_CARDS: DashboardLinkItem[] = [
  {
    href: "/dashboard/signals",
    label: "합격 가능성 신호등",
    description: "입결 기반으로 안정·적정·도전을 빠르게 확인합니다.",
    icon: TrendingUp,
  },
  {
    href: "/dashboard/chat",
    label: "AI 요강 챗봇",
    description: "대학 전형계획과 정시 자료를 근거로 질의응답합니다.",
    icon: Bot,
  },
  {
    href: "/dashboard/scores",
    label: "성적 관리",
    description: "모의고사·내신을 입력하고 추이를 관리합니다.",
    icon: BarChart3,
  },
  {
    href: "/dashboard/calendar",
    label: "입시 캘린더",
    description: "가족 일정과 D-Day를 한눈에 관리합니다.",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/student-record",
    label: "생활기록부",
    description: "세특·창체·수상·출결 정보를 체계적으로 입력합니다.",
    icon: FileText,
  },
  {
    href: "/dashboard/simulator",
    label: "원서 배분 시뮬레이터",
    description: "수시 6장 포트폴리오 리스크를 시뮬레이션합니다.",
    icon: LayoutGrid,
  },
];

export const DASHBOARD_MORE_SECTIONS: DashboardMenuSection[] = [
  {
    title: "분석 도구",
    items: [
      { href: "/dashboard/nulsul", label: "논술 경쟁률 판독기", icon: FileText },
      { href: "/dashboard/subject-analysis", label: "선택과목 분석기", icon: BookOpen },
      { href: "/dashboard/science-combo", label: "과탐 조합 시뮬레이터", icon: FlaskConical },
      { href: "/dashboard/trend-analysis", label: "연도별 입결 추이", icon: TrendingUp },
      { href: "/dashboard/placement-table", label: "정시 배치표", icon: LayoutList },
      { href: "/dashboard/jeongsi-gun", label: "정시 군별 전략", icon: Map },
    ],
  },
  {
    title: "AI 도우미",
    items: [
      { href: "/dashboard/hakjong-analysis", label: "학종 역량 분석", icon: Brain },
      { href: "/dashboard/gap-analysis", label: "Gap Analysis", icon: GitCompare },
      { href: "/dashboard/personal-statement", label: "자소서 코치", icon: PenLine },
      { href: "/dashboard/research-topics", label: "탐구 주제 추천", icon: Lightbulb },
      { href: "/dashboard/mock-interview", label: "모의 면접", icon: Mic },
    ],
  },
  {
    title: "진로 설계",
    items: [
      { href: "/dashboard/early-roadmap", label: "조기 설계 로드맵", icon: Route },
      { href: "/dashboard/nsu-strategy", label: "N수생 전략", icon: RefreshCw },
      { href: "/dashboard/explore", label: "전국 대학 탐색기", icon: Search },
      { href: "/dashboard/exam-analysis", label: "기출 분석", icon: Archive },
    ],
  },
  {
    title: "성적 관리",
    items: [
      { href: "/dashboard/scores", label: "Z점수 판별", icon: BarChart2 },
      { href: "/dashboard/gachaejeom", label: "수능 가채점 계산기", icon: Calculator },
      { href: "/dashboard/grade-simulator", label: "성적 예측 시뮬레이터", icon: Activity },
      { href: "/dashboard/scores", label: "나이스 이미지 파싱", icon: ScanLine },
    ],
  },
  {
    title: "도움말",
    items: [{ href: "/dashboard/help", label: "도움말", icon: HelpCircle }],
  },
];

export const DASHBOARD_QUICK_NAV: DashboardLinkItem[] = [
  { href: "/dashboard", label: "홈", icon: LayoutGrid },
  { href: "/dashboard/signals", label: "신호등", icon: TrendingUp },
  { href: "/dashboard/chat", label: "챗봇", icon: Bot },
  { href: "/dashboard/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/dashboard/explore", label: "탐색", icon: GraduationCap },
  { href: "/dashboard/more", label: "더보기", icon: ChevronRight },
];
