import type { SubjectCategory } from "@/lib/validation/schoolGpaScore"

export type SchoolYearFilter = "ALL" | "1" | "2" | "3"

export type SchoolRecordListItem = {
  id: number
  semester: string | null
}

const SEMESTER_ORDER = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"] as const

export const SHORT_SUBJECT_CATEGORY_LABEL: Record<SubjectCategory, string> = {
  general: "보통교과",
  career_choice: "진로선택",
  pe_art: "체육·예술",
}

function getSemesterOrderIndex(semester: string | null): number {
  if (!semester) return Number.MAX_SAFE_INTEGER
  const index = SEMESTER_ORDER.indexOf(semester as (typeof SEMESTER_ORDER)[number])
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function getYearFromSemester(semester: string | null): SchoolYearFilter {
  const first = semester?.split("-")[0]
  return first === "1" || first === "2" || first === "3" ? first : "ALL"
}

export function buildSchoolSections<T extends SchoolRecordListItem>(
  schoolRecords: T[],
  yearFilter: SchoolYearFilter
): Array<{ semester: string; title: string; items: T[] }> {
  const sorted = [...schoolRecords].sort(
    (a, b) => getSemesterOrderIndex(a.semester) - getSemesterOrderIndex(b.semester)
  )
  const grouped = new Map<string, T[]>()
  for (const record of sorted) {
    const semester = record.semester
    if (!semester) continue
    const year = getYearFromSemester(semester)
    if (yearFilter !== "ALL" && year !== yearFilter) continue
    const list = grouped.get(semester) ?? []
    list.push(record)
    grouped.set(semester, list)
  }

  return SEMESTER_ORDER.filter((semester) => grouped.has(semester)).map((semester) => {
    const [year, term] = semester.split("-")
    const items = grouped.get(semester) ?? []
    return {
      semester,
      title: `${year}학년 ${term}학기 (${items.length}과목)`,
      items,
    }
  })
}
