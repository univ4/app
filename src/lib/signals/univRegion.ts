/** 매뉴얼 §3.2 지역 필터 — `admission_records.univ_name` 기준(접미사·별칭 허용). */

const SEOUL_PREFIXES = [
  "서울대",
  "연세대",
  "고려대",
  "성균관대",
  "한양대",
  "서강대",
  "중앙대",
  "경희대",
  "건국대",
  "홍익대",
  "동국대",
  "국민대",
  "숭실대",
  "세종대",
  "광운대",
  "서울시립대",
  "시립대",
  "삼육대",
  "상명대",
  "가톨릭대",
  "한국외대",
  "서울과학기술대",
  "서울여대",
  "덕성여대",
  "성신여대",
  "한성대",
  "명지대",
  "서경대",
  "한국체육대",
] as const;

const CAPITAL_EXTRA = [
  "아주대",
  "인하대",
  "단국대",
  "가천대",
  "한국항공대",
  "한양대ERICA",
  "경기대",
  "수원대",
  "용인대",
  "평택대",
  "중부대",
  "차의과학대",
] as const;

export type UnivRegionBucket = "seoul" | "capital" | "provincial";

function normalizeUnivName(name: string): string {
  return name.replace(/\s+/g, "").replace(/대학교$/u, "대");
}

function startsWithAny(norm: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => norm.startsWith(p) || norm.includes(p));
}

export function classifyUnivRegion(univName: string): UnivRegionBucket {
  const n = normalizeUnivName(univName.trim());
  if (startsWithAny(n, SEOUL_PREFIXES)) return "seoul";
  if (startsWithAny(n, CAPITAL_EXTRA)) return "capital";
  return "provincial";
}
