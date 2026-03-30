"use client";

import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NEIS_SEMESTERS, type NeisSemester } from "@/lib/validation/schoolGpaScore";

type VisionSubjectRow = {
  subjectName: string;
  grade: string;
  rawScore: string;
  classAvg: string;
  stdDev: string;
  creditUnit: string;
  studentCount: string;
  achievementLevel: string;
};

type ParsedPreview = {
  grade: number;
  semester: number;
  neisSemester: NeisSemester;
};

function parseOptionalNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rowToPayload(r: VisionSubjectRow) {
  return {
    subjectName: r.subjectName.trim(),
    grade: parseOptionalNumber(r.grade),
    rawScore: parseOptionalNumber(r.rawScore),
    classAvg: parseOptionalNumber(r.classAvg),
    stdDev: parseOptionalNumber(r.stdDev),
    creditUnit: parseOptionalNumber(r.creditUnit),
    studentCount: parseOptionalNumber(r.studentCount),
    achievementLevel:
      r.achievementLevel.trim() === "" ? null : r.achievementLevel.trim().toUpperCase(),
  };
}

function visionToEditable(
  subjects: Array<{
    subjectName: string;
    grade?: number | null;
    rawScore?: number | null;
    classAvg?: number | null;
    stdDev?: number | null;
    creditUnit?: number | null;
    studentCount?: number | null;
    achievementLevel?: string | null;
  }>,
): VisionSubjectRow[] {
  return subjects.map((s) => ({
    subjectName: s.subjectName,
    grade: s.grade != null ? String(s.grade) : "",
    rawScore: s.rawScore != null ? String(s.rawScore) : "",
    classAvg: s.classAvg != null ? String(s.classAvg) : "",
    stdDev: s.stdDev != null ? String(s.stdDev) : "",
    creditUnit: s.creditUnit != null ? String(s.creditUnit) : "",
    studentCount: s.studentCount != null ? String(s.studentCount) : "",
    achievementLevel: s.achievementLevel?.trim() ?? "",
  }));
}

export function ImageUpload({ onSaved }: { onSaved?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [rows, setRows] = useState<VisionSubjectRow[]>([]);

  const resetFlow = useCallback(() => {
    setFile(null);
    setPreview(null);
    setRows([]);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const runParse = useCallback(
    async (f: File, dryRun: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const fd = new FormData();
        fd.append("file", f);
        if (dryRun) fd.append("dry_run", "1");
        const res = await fetch("/api/scores/parse-image", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error?.message ?? "요청에 실패했습니다.");
          return;
        }
        const p = json?.data?.parsed;
        if (!p?.neisSemester || !Array.isArray(p.subjects)) {
          setError("응답 형식이 올바르지 않습니다.");
          return;
        }
        if (!(NEIS_SEMESTERS as readonly string[]).includes(p.neisSemester)) {
          setError("학기 코드가 올바르지 않습니다.");
          return;
        }
        setPreview({
          grade: typeof p.grade === "number" ? p.grade : Number(p.grade),
          semester: typeof p.semester === "number" ? p.semester : Number(p.semester),
          neisSemester: p.neisSemester as NeisSemester,
        });
        setRows(visionToEditable(p.subjects));
        if (!dryRun) {
          onSaved?.();
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [onSaved],
  );

  const onPickFile = useCallback((f: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(null);
    setRows([]);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f) onPickFile(f);
    },
    [onPickFile],
  );

  const commitSave = useCallback(async () => {
    if (!preview) return;
    setSaveLoading(true);
    setError(null);
    try {
      const subjects = rows.map(rowToPayload);
      const res = await fetch("/api/scores/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semester: preview.neisSemester,
          subjects,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "저장에 실패했습니다.");
        return;
      }
      onSaved?.();
      resetFlow();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaveLoading(false);
    }
  }, [preview, rows, onSaved, resetFlow]);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        나이스(NEIS) 학생 성적 확인서 스크린샷(PNG·JPG, 최대 10MB)을 올리면 Claude Vision으로 과목을
        추출합니다. 미리보기에서 값을 고친 뒤 저장하세요.
      </p>

      <div
        className={`rounded-lg border border-dashed p-6 transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="text-center text-sm sm:text-left">
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <span>파일을 끌어다 놓거나 선택하세요.</span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              파일 선택
            </Button>
            <Button
              type="button"
              disabled={!file || loading}
              onClick={() => file && void runParse(file, true)}
            >
              {loading ? "파싱 중…" : "미리보기(파싱)"}
            </Button>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="space-y-3">
          <p className="text-sm">
            학기: <strong>{preview.neisSemester}</strong> (추출 학년·학기: {preview.grade}학년{" "}
            {preview.semester}학기)
          </p>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Table className="min-w-[720px] text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>과목명</TableHead>
                  <TableHead>단위</TableHead>
                  <TableHead>석차등급</TableHead>
                  <TableHead>원점수</TableHead>
                  <TableHead>평균</TableHead>
                  <TableHead>표준편차</TableHead>
                  <TableHead>수강자수</TableHead>
                  <TableHead>성취도</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.subjectName}-${i}`}>
                    <TableCell className="min-w-[100px]">
                      <Input
                        value={row.subjectName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, subjectName: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-16">
                      <Input
                        inputMode="numeric"
                        value={row.creditUnit}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, creditUnit: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-16">
                      <Input
                        inputMode="numeric"
                        value={row.grade}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, grade: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-20">
                      <Input
                        inputMode="decimal"
                        value={row.rawScore}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, rawScore: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-20">
                      <Input
                        inputMode="decimal"
                        value={row.classAvg}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, classAvg: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-20">
                      <Input
                        inputMode="decimal"
                        value={row.stdDev}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, stdDev: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-20">
                      <Input
                        inputMode="numeric"
                        value={row.studentCount}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, studentCount: v } : r)),
                          );
                        }}
                      />
                    </TableCell>
                    <TableCell className="w-24">
                      <select
                        className="border-input bg-background h-10 w-full rounded-md border px-2 text-sm"
                        value={row.achievementLevel}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) =>
                            prev.map((r, j) => (j === i ? { ...r, achievementLevel: v } : r)),
                          );
                        }}
                      >
                        <option value="">—</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={saveLoading} onClick={() => void commitSave()}>
              {saveLoading ? "저장 중…" : "확인 후 저장"}
            </Button>
            <Button type="button" variant="outline" onClick={resetFlow}>
              초기화
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
