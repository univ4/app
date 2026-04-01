import { buildSchoolSections } from "@/lib/scores/schoolGpaSections"

type Item = { id: number; semester: string | null }

describe("buildSchoolSections", () => {
  const records: Item[] = [
    { id: 1, semester: "2-2" },
    { id: 2, semester: "1-2" },
    { id: 3, semester: "1-1" },
    { id: 4, semester: "3-1" },
    { id: 5, semester: null },
    { id: 6, semester: "2-1" },
  ]

  it("groups by semester in fixed order and skips empty semesters", () => {
    const sections = buildSchoolSections(records, "ALL")
    expect(sections.map((section) => section.semester)).toEqual(["1-1", "1-2", "2-1", "2-2", "3-1"])
    expect(sections.map((section) => section.title)).toEqual([
      "1학년 1학기 (1과목)",
      "1학년 2학기 (1과목)",
      "2학년 1학기 (1과목)",
      "2학년 2학기 (1과목)",
      "3학년 1학기 (1과목)",
    ])
  })

  it("filters by selected year", () => {
    const secondYear = buildSchoolSections(records, "2")
    expect(secondYear.map((section) => section.semester)).toEqual(["2-1", "2-2"])
    const thirdYear = buildSchoolSections(records, "3")
    expect(thirdYear.map((section) => section.semester)).toEqual(["3-1"])
  })
})
