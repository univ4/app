"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ScoreTrendChart, type MockExamTrendRecord } from "@/components/scores/ScoreTrendChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockExamSchema = z.object({
  exam_date: z.string().min(1, "시험 날짜를 입력하세요."),
  korean_standard_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  korean_percentile: z.coerce.number({ message: "숫자를 입력하세요." }),
  korean_grade: z.coerce.number().int().min(1).max(9),
  math_standard_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  math_percentile: z.coerce.number({ message: "숫자를 입력하세요." }),
  math_grade: z.coerce.number().int().min(1).max(9),
  english_grade: z.coerce.number().int().min(1).max(9),
  sci1_subject: z.string().min(1, "과탐1 과목명을 입력하세요."),
  sci1_standard_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  sci1_percentile: z.coerce.number({ message: "숫자를 입력하세요." }),
  sci2_subject: z.string().min(1, "과탐2 과목명을 입력하세요."),
  sci2_standard_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  sci2_percentile: z.coerce.number({ message: "숫자를 입력하세요." }),
});

const schoolGpaSchema = z.object({
  exam_date: z.string().min(1, "시험 날짜를 입력하세요."),
  subject_name: z.string().min(1, "과목명을 입력하세요."),
  raw_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  avg_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  stddev_score: z.coerce.number({ message: "숫자를 입력하세요." }),
  student_count: z.coerce.number().int().positive("1 이상 입력하세요."),
  credit_unit: z.coerce.number().int().positive("1 이상 입력하세요."),
  school_grade: z.coerce.number().min(1).max(9),
  achievement_level: z.enum(["A", "B", "C", ""]),
});

type MockExamFormValues = z.infer<typeof mockExamSchema>;
type SchoolGpaFormValues = z.infer<typeof schoolGpaSchema>;

type AcademicRecord = {
  id: number;
  record_type: "MOCK_EXAM" | "SCHOOL_GPA";
  exam_date: string;
  korean_grade: number | null;
  math_grade: number | null;
  english_grade: number | null;
  subject_name: string | null;
  raw_score: number | null;
  avg_score: number | null;
  school_grade: number | null;
};

function parseScienceLabel(subjectName: string | null) {
  if (!subjectName) return "-";
  const [sci1Raw, sci2Raw] = subjectName.split("|");
  const sci1 = sci1Raw?.replace("sci1:", "") ?? "";
  const sci2 = sci2Raw?.replace("sci2:", "") ?? "";
  if (!sci1 && !sci2) return "-";
  return `${sci1} / ${sci2}`.trim();
}

export default function ScoresPage() {
  const [activeTab, setActiveTab] = useState<"MOCK_EXAM" | "SCHOOL_GPA">("MOCK_EXAM");
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [mockTrendRecords, setMockTrendRecords] = useState<MockExamTrendRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const mockForm = useForm<MockExamFormValues>({
    resolver: zodResolver(mockExamSchema) as any,
    defaultValues: {
      exam_date: "",
      sci1_subject: "",
      sci2_subject: "",
    },
  });

  const schoolForm = useForm<SchoolGpaFormValues>({
    resolver: zodResolver(schoolGpaSchema) as any,
    defaultValues: {
      exam_date: "",
      subject_name: "",
      achievement_level: "",
    },
  });

  const filteredRecords = useMemo(
    () => records.filter((record) => record.record_type === activeTab),
    [activeTab, records],
  );

  async function fetchRecords() {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch("/api/scores", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        setApiError(json?.error?.message ?? "성적 목록을 불러오지 못했습니다.");
        return;
      }
      setRecords(json.data.items ?? []);
    } catch {
      setApiError("성적 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMockTrendRecords() {
    try {
      const response = await fetch("/api/scores?type=MOCK_EXAM", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) return;
      setMockTrendRecords(json.data.items ?? []);
    } catch {
      setMockTrendRecords([]);
    }
  }

  useEffect(() => {
    void fetchRecords();
    void fetchMockTrendRecords();
  }, []);

  async function submitMock(values: MockExamFormValues) {
    setApiError(null);
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_type: "MOCK_EXAM",
        ...values,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      setApiError(json?.error?.message ?? "저장에 실패했습니다.");
      return;
    }

    mockForm.reset({
      exam_date: "",
      sci1_subject: "",
      sci2_subject: "",
    });
    await fetchRecords();
    await fetchMockTrendRecords();
  }

  async function submitSchool(values: SchoolGpaFormValues) {
    setApiError(null);
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_type: "SCHOOL_GPA",
        ...values,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setApiError(json?.error?.message ?? "저장에 실패했습니다.");
      return;
    }

    schoolForm.reset({
      exam_date: "",
      subject_name: "",
      achievement_level: "",
    });
    await fetchRecords();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <ScoreTrendChart records={mockTrendRecords} />

      <Card>
        <CardHeader>
          <CardTitle>성적 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "MOCK_EXAM" | "SCHOOL_GPA")}
          >
            <TabsList>
              <TabsTrigger value="MOCK_EXAM">모의고사</TabsTrigger>
              <TabsTrigger value="SCHOOL_GPA">내신</TabsTrigger>
            </TabsList>

            <TabsContent value="MOCK_EXAM" className="mt-4">
              <form onSubmit={mockForm.handleSubmit(submitMock)} className="space-y-4">
                <Field label="시험 날짜" error={mockForm.formState.errors.exam_date?.message}>
                  <Input type="date" {...mockForm.register("exam_date")} />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="국어 표준점수" error={mockForm.formState.errors.korean_standard_score?.message}>
                    <Input type="number" {...mockForm.register("korean_standard_score")} />
                  </Field>
                  <Field label="국어 백분위" error={mockForm.formState.errors.korean_percentile?.message}>
                    <Input type="number" {...mockForm.register("korean_percentile")} />
                  </Field>
                  <Field label="국어 등급" error={mockForm.formState.errors.korean_grade?.message}>
                    <Input type="number" {...mockForm.register("korean_grade")} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="수학 표준점수" error={mockForm.formState.errors.math_standard_score?.message}>
                    <Input type="number" {...mockForm.register("math_standard_score")} />
                  </Field>
                  <Field label="수학 백분위" error={mockForm.formState.errors.math_percentile?.message}>
                    <Input type="number" {...mockForm.register("math_percentile")} />
                  </Field>
                  <Field label="수학 등급" error={mockForm.formState.errors.math_grade?.message}>
                    <Input type="number" {...mockForm.register("math_grade")} />
                  </Field>
                </div>
                <Field label="영어 등급" error={mockForm.formState.errors.english_grade?.message}>
                  <Input type="number" {...mockForm.register("english_grade")} />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="과탐1 과목명" error={mockForm.formState.errors.sci1_subject?.message}>
                    <Input {...mockForm.register("sci1_subject")} />
                  </Field>
                  <Field label="과탐1 표준점수" error={mockForm.formState.errors.sci1_standard_score?.message}>
                    <Input type="number" {...mockForm.register("sci1_standard_score")} />
                  </Field>
                  <Field label="과탐1 백분위" error={mockForm.formState.errors.sci1_percentile?.message}>
                    <Input type="number" {...mockForm.register("sci1_percentile")} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="과탐2 과목명" error={mockForm.formState.errors.sci2_subject?.message}>
                    <Input {...mockForm.register("sci2_subject")} />
                  </Field>
                  <Field label="과탐2 표준점수" error={mockForm.formState.errors.sci2_standard_score?.message}>
                    <Input type="number" {...mockForm.register("sci2_standard_score")} />
                  </Field>
                  <Field label="과탐2 백분위" error={mockForm.formState.errors.sci2_percentile?.message}>
                    <Input type="number" {...mockForm.register("sci2_percentile")} />
                  </Field>
                </div>
                <Button type="submit" disabled={mockForm.formState.isSubmitting}>
                  저장
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="SCHOOL_GPA" className="mt-4">
              <form onSubmit={schoolForm.handleSubmit(submitSchool)} className="space-y-4">
                <Field label="시험 날짜" error={schoolForm.formState.errors.exam_date?.message}>
                  <Input type="date" {...schoolForm.register("exam_date")} />
                </Field>
                <Field label="과목명" error={schoolForm.formState.errors.subject_name?.message}>
                  <Input {...schoolForm.register("subject_name")} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="원점수" error={schoolForm.formState.errors.raw_score?.message}>
                    <Input type="number" {...schoolForm.register("raw_score")} />
                  </Field>
                  <Field label="평균" error={schoolForm.formState.errors.avg_score?.message}>
                    <Input type="number" {...schoolForm.register("avg_score")} />
                  </Field>
                  <Field label="표준편차" error={schoolForm.formState.errors.stddev_score?.message}>
                    <Input type="number" {...schoolForm.register("stddev_score")} />
                  </Field>
                  <Field label="수강자수" error={schoolForm.formState.errors.student_count?.message}>
                    <Input type="number" {...schoolForm.register("student_count")} />
                  </Field>
                  <Field label="단위수" error={schoolForm.formState.errors.credit_unit?.message}>
                    <Input type="number" {...schoolForm.register("credit_unit")} />
                  </Field>
                  <Field label="등급" error={schoolForm.formState.errors.school_grade?.message}>
                    <Input type="number" step="0.1" {...schoolForm.register("school_grade")} />
                  </Field>
                </div>
                <Field label="성취도 (선택)" error={schoolForm.formState.errors.achievement_level?.message}>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                    {...schoolForm.register("achievement_level")}
                  >
                    <option value="">선택 안 함</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </Field>
                <Button type="submit" disabled={schoolForm.formState.isSubmitting}>
                  저장
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          {apiError ? <p className="mt-4 text-sm text-red-600">{apiError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>성적 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-600">불러오는 중...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {activeTab === "MOCK_EXAM" ? (
                    <>
                      <TableHead>날짜</TableHead>
                      <TableHead>국어등급</TableHead>
                      <TableHead>수학등급</TableHead>
                      <TableHead>영어등급</TableHead>
                      <TableHead>과탐</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>날짜</TableHead>
                      <TableHead>과목명</TableHead>
                      <TableHead>등급</TableHead>
                      <TableHead>원점수/평균</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "MOCK_EXAM" ? 5 : 4}>
                      입력된 성적이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) =>
                    activeTab === "MOCK_EXAM" ? (
                      <TableRow key={record.id}>
                        <TableCell>{record.exam_date}</TableCell>
                        <TableCell>{record.korean_grade ?? "-"}</TableCell>
                        <TableCell>{record.math_grade ?? "-"}</TableCell>
                        <TableCell>{record.english_grade ?? "-"}</TableCell>
                        <TableCell>{parseScienceLabel(record.subject_name)}</TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={record.id}>
                        <TableCell>{record.exam_date}</TableCell>
                        <TableCell>{record.subject_name ?? "-"}</TableCell>
                        <TableCell>{record.school_grade ?? "-"}</TableCell>
                        <TableCell>
                          {record.raw_score ?? "-"} / {record.avg_score ?? "-"}
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
