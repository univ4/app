/**
 * 온보딩 목표 대학 선택지. `supabase/seed.sql`에 등장하는 대학명과 맞춥니다.
 */
export type TargetUniversityGroup = {
  label: string;
  universities: readonly string[];
  /** 그룹 설명(선택) */
  note?: string;
};

export const TARGET_UNIVERSITY_GROUPS: readonly TargetUniversityGroup[] = [
  {
    label: "SKY",
    universities: ["서울대", "연세대", "고려대"],
  },
  {
    label: "서성한",
    universities: ["서강대", "성균관대", "한양대"],
  },
  {
    label: "중경외시건",
    universities: ["중앙대", "경희대", "시립대", "건국대"],
  },
  {
    label: "인서울 이공",
    universities: [
      "숭실대",
      "세종대",
      "국민대",
      "광운대",
      "동국대",
      "홍익대",
      "단국대(죽전)",
    ],
  },
  {
    label: "수도권 이공",
    universities: ["아주대", "인하대", "한국항공대", "가천대", "한양대ERICA"],
  },
  {
    label: "지방 거점 국립대",
    universities: ["부산대", "경북대", "전남대", "충남대", "전북대"],
  },
  {
    label: "과기원",
    universities: ["KAIST", "POSTECH", "UNIST", "DGIST", "GIST"],
    note: "정시 없음 · 수시 학종 중심",
  },
] as const;
