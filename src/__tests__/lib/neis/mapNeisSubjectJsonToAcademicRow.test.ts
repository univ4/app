import {
  mapNeisJsonToRow,
  visionSubjectToNeisJson,
} from "@/lib/neis/mapNeisSubjectJsonToAcademicRow";

describe("mapNeisJsonToRow", () => {
  it("보통교과: 석차등급·원점수·단위 있으면 행 생성", () => {
    const r = mapNeisJsonToRow("u1", "2-1", {
      subject_name: "수학Ⅰ",
      unit: 4,
      raw_score: 88,
      class_avg: 72,
      std_dev: 14,
      student_count: 120,
      grade: 3,
      achievement: null,
      rank: null,
      rank_total: null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.row.subject_category).toBe("general");
      expect(r.row.school_grade).toBe(3);
      expect(r.row.semester).toBe("2-1");
    }
  });

  it("단위 누락 시 스킵 사유", () => {
    const r = mapNeisJsonToRow(
      "u1",
      "2-1",
      visionSubjectToNeisJson({
        subjectName: "국어",
        creditUnit: null,
        rawScore: 90,
        grade: 2,
      }),
    );
    expect(r.ok).toBe(false);
  });
});
