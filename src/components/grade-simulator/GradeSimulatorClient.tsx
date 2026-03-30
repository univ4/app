"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { calcGradeSimulator } from "@/lib/calculators/calcGradeSimulator";

import { GradeSimulatorForm, type GradeSimulatorSubjectRow } from "./GradeSimulatorForm";
import { GradeSimulatorResult } from "./GradeSimulatorResult";

type GetRecord = {
  id: number;
  subject_name: string | null;
  school_grade: number | null;
  credit_unit: number | null;
  semester: string | null;
  exam_date: string;
};

type UnivRow = { univName: string; cutoffGrade: number };

function clampGrade(g: number) {
  return Math.min(9, Math.max(1, Math.round(g)));
}

export function GradeSimulatorClient() {
  const [records, setRecords] = useState<GetRecord[]>([]);
  const [universities, setUniversities] = useState<UnivRow[]>([]);
  const [admissionYearMeta, setAdmissionYearMeta] = useState(2027);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetBySubjectKey, setTargetBySubjectKey] = useState<Record<string, number>>({});
  const [selectedUniv, setSelectedUniv] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/grade-simulator?admissionYear=2027", { cache: "no-store" });
      const body = (await res.json()) as {
        data: {
          records: GetRecord[];
          universities: UnivRow[];
          admissionYear: number;
        } | null;
        error: { code: string; message: string } | null;
      };
      if (!res.ok || body.error || !body.data) {
        setRecords([]);
        setUniversities([]);
        setError(body.error?.message ?? `불러오기 실패 (${res.status})`);
        return;
      }
      setRecords(body.data.records);
      setUniversities(body.data.universities);
      setAdmissionYearMeta(body.data.admissionYear);
    } catch {
      setError("네트워크 오류로 데이터를 불러오지 못했습니다.");
      setRecords([]);
      setUniversities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subjects: GradeSimulatorSubjectRow[] = useMemo(() => {
    return records
      .filter(
        (r) =>
          r.school_grade != null &&
          r.credit_unit != null &&
          Number(r.credit_unit) > 0 &&
          Number.isFinite(Number(r.school_grade)),
      )
      .map((r) => ({
        id: r.id,
        subjectName: r.subject_name?.trim() || "(과목명 없음)",
        currentGrade: Number(r.school_grade),
        creditUnit: Number(r.credit_unit),
        semester: r.semester ?? "",
      }));
  }, [records]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const s of subjects) {
      next[`${s.id}`] = clampGrade(s.currentGrade);
    }
    setTargetBySubjectKey(next);
  }, [subjects]);

  const cutoffGrade = useMemo(() => {
    if (!selectedUniv) return undefined;
    return universities.find((u) => u.univName === selectedUniv)?.cutoffGrade;
  }, [selectedUniv, universities]);

  const result = useMemo(() => {
    if (subjects.length === 0) return null;
    try {
      return calcGradeSimulator({
        currentSubjects: subjects.map((s) => ({
          subjectName: s.subjectName,
          currentGrade: s.currentGrade,
          creditUnit: s.creditUnit,
          semester: s.semester,
        })),
        targetGrades: subjects.map((s) => ({
          subjectName: s.subjectName,
          targetGrade: clampGrade(targetBySubjectKey[`${s.id}`] ?? s.currentGrade),
          semester: s.semester,
        })),
        cutoffGrade,
      });
    } catch {
      return null;
    }
  }, [subjects, targetBySubjectKey, cutoffGrade]);

  const onTargetChange = useCallback((subjectKey: string, grade: number) => {
    setTargetBySubjectKey((prev) => ({ ...prev, [subjectKey]: grade }));
  }, []);

  const onRunSimulation = useCallback(() => {
    const el = document.getElementById("grade-simulator-result");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (loading) {
    return <p className="text-muted-foreground text-sm">내신 데이터를 불러오는 중…</p>;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground text-sm">
        입시 연도 <span className="text-foreground font-medium">{admissionYearMeta}</span> ·
        학생부교과 컷은 admission_records 최저 컷(모집단위별 중 최소값)을 사용합니다.
      </p>

      <GradeSimulatorForm
        subjects={subjects}
        targetBySubjectKey={targetBySubjectKey}
        onTargetChange={onTargetChange}
        universities={universities}
        selectedUniv={selectedUniv}
        onSelectUniv={setSelectedUniv}
        onRunSimulation={onRunSimulation}
      />

      <div id="grade-simulator-result">
        <GradeSimulatorResult result={result} hasCutoff={cutoffGrade != null} />
      </div>
    </div>
  );
}
