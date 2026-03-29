"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { ScoreTrendChart, type MockExamTrendRecord } from "@/components/scores/ScoreTrendChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NEIS_SEMESTERS,
  SUBJECT_CATEGORIES,
  schoolGpaFormSchema,
  type SchoolGpaFormValues,
  type SubjectCategory,
} from "@/lib/validation/schoolGpaScore";

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

type MockExamFormValues = z.infer<typeof mockExamSchema>;

const SUBJECT_CATEGORY_LABEL: Record<SubjectCategory, string> = {
  general: "보통교과 (석차등급 있음)",
  career_choice: "진로선택과목 (성취도만, 석차등급 없음)",
  pe_art: "체육·예술과목 (원점수+성취도만)",
};

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
  semester: string | null;
  subject_category: SubjectCategory | null;
  achievement_level: string | null;
  class_rank: number | null;
  rank_total: number | null;
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
    resolver: zodResolver(mockExamSchema) as unknown as Resolver<MockExamFormValues>,
    defaultValues: {
      exam_date: "",
      sci1_subject: "",
      sci2_subject: "",
    },
  });

  const schoolForm = useForm<SchoolGpaFormValues>({
    resolver: zodResolver(schoolGpaFormSchema) as unknown as Resolver<SchoolGpaFormValues>,
    defaultValues: {
      semester: "3-1",
      subject_category: "general",
      subject_name: "",
      credit_unit: 4,
      achievement_level: "",
    } as unknown as SchoolGpaFormValues,
  });

  const schoolCategory = schoolForm.watch("subject_category");
  const schoolErrors = schoolForm.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  useEffect(() => {
    if (schoolCategory === "career_choice") {
      schoolForm.unregister(["class_rank", "rank_total", "school_grade"]);
    } else if (schoolCategory === "pe_art") {
      schoolForm.unregister([
        "total_score",
        "avg_score",
        "stddev_score",
        "student_count",
        "class_rank",
        "rank_total",
        "school_grade",
      ]);
    }
  }, [schoolCategory, schoolForm]);

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
      semester: values.semester,
      subject_category: "general",
      subject_name: "",
      credit_unit: 4,
      achievement_level: "",
    } as unknown as SchoolGpaFormValues);
    await fetchRecords();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 p-4 sm:p-6">
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
            <TabsList className="h-auto min-h-0 w-full flex-wrap justify-start gap-1 sm:w-fit">
              <TabsTrigger value="MOCK_EXAM" className="min-h-11 flex-none sm:min-h-0">
                모의고사
              </TabsTrigger>
              <TabsTrigger value="SCHOOL_GPA" className="min-h-11 flex-none sm:min-h-0">
                내신
              </TabsTrigger>
            </TabsList>

            <TabsContent value="MOCK_EXAM" className="mt-4">
              <form onSubmit={mockForm.handleSubmit(submitMock)} className="space-y-4">
                <Field label="시험 날짜" error={mockForm.formState.errors.exam_date?.message}>
                  <Input type="date" autoComplete="off" {...mockForm.register("exam_date")} />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="국어 표준점수" error={mockForm.formState.errors.korean_standard_score?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("korean_standard_score")}
                    />
                  </Field>
                  <Field label="국어 백분위" error={mockForm.formState.errors.korean_percentile?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("korean_percentile")}
                    />
                  </Field>
                  <Field label="국어 등급" error={mockForm.formState.errors.korean_grade?.message}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      {...mockForm.register("korean_grade")}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="수학 표준점수" error={mockForm.formState.errors.math_standard_score?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("math_standard_score")}
                    />
                  </Field>
                  <Field label="수학 백분위" error={mockForm.formState.errors.math_percentile?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("math_percentile")}
                    />
                  </Field>
                  <Field label="수학 등급" error={mockForm.formState.errors.math_grade?.message}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      {...mockForm.register("math_grade")}
                    />
                  </Field>
                </div>
                <Field label="영어 등급" error={mockForm.formState.errors.english_grade?.message}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...mockForm.register("english_grade")}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="과탐1 과목명" error={mockForm.formState.errors.sci1_subject?.message}>
                    <Input {...mockForm.register("sci1_subject")} />
                  </Field>
                  <Field label="과탐1 표준점수" error={mockForm.formState.errors.sci1_standard_score?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("sci1_standard_score")}
                    />
                  </Field>
                  <Field label="과탐1 백분위" error={mockForm.formState.errors.sci1_percentile?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("sci1_percentile")}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="과탐2 과목명" error={mockForm.formState.errors.sci2_subject?.message}>
                    <Input {...mockForm.register("sci2_subject")} />
                  </Field>
                  <Field label="과탐2 표준점수" error={mockForm.formState.errors.sci2_standard_score?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("sci2_standard_score")}
                    />
                  </Field>
                  <Field label="과탐2 백분위" error={mockForm.formState.errors.sci2_percentile?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      {...mockForm.register("sci2_percentile")}
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={mockForm.formState.isSubmitting}>
                  저장
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="SCHOOL_GPA" className="mt-4">
              <form onSubmit={schoolForm.handleSubmit(submitSchool)} className="space-y-4">
                <Field label="학년·학기" error={schoolErrors.semester?.message}>
                  <select
                    className="border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm sm:h-10 sm:min-h-10"
                    {...schoolForm.register("semester")}
                  >
                    {NEIS_SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="과목 구분" error={schoolErrors.subject_category?.message}>
                  <select
                    className="border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm sm:h-10 sm:min-h-10"
                    {...schoolForm.register("subject_category")}
                  >
                    {SUBJECT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {SUBJECT_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="과목명" error={schoolErrors.subject_name?.message}>
                  <Input {...schoolForm.register("subject_name")} />
                </Field>
                <Field label="단위수 (이수학점)" error={schoolErrors.credit_unit?.message}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...schoolForm.register("credit_unit")}
                  />
                </Field>

                {schoolCategory !== "pe_art" ? (
                  <>
                    {(schoolCategory === "general" || schoolCategory === "career_choice") && (
                      <Field
                        label="합계"
                        description={schoolCategory === "career_choice" ? "지필+수행 가중합산 (선택)" : "지필+수행 가중합산"}
                        error={schoolErrors.total_score?.message}
                      >
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          {...schoolForm.register("total_score")}
                        />
                      </Field>
                    )}
                    <Field label="원점수" error={schoolErrors.raw_score?.message}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        {...schoolForm.register("raw_score")}
                      />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="과목평균" error={schoolErrors.avg_score?.message}>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          {...schoolForm.register("avg_score")}
                        />
                      </Field>
                      <Field label="표준편차" error={schoolErrors.stddev_score?.message}>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          {...schoolForm.register("stddev_score")}
                        />
                      </Field>
                      <Field label="수강자수" error={schoolErrors.student_count?.message}>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          {...schoolForm.register("student_count")}
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <Field label="원점수" error={schoolErrors.raw_score?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      {...schoolForm.register("raw_score")}
                    />
                  </Field>
                )}

                {schoolCategory === "general" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="석차" error={schoolErrors.class_rank?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...schoolForm.register("class_rank")}
                      />
                    </Field>
                    <Field label="전체인원" error={schoolErrors.rank_total?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        {...schoolForm.register("rank_total")}
                      />
                    </Field>
                    <Field label="석차등급" error={schoolErrors.school_grade?.message}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        {...schoolForm.register("school_grade")}
                      />
                    </Field>
                  </div>
                ) : null}

                <Field
                  label={schoolCategory === "general" ? "성취도 (선택)" : "성취도"}
                  error={schoolErrors.achievement_level?.message}
                >
                  <select
                    className="border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm sm:h-10 sm:min-h-10"
                    {...schoolForm.register("achievement_level")}
                  >
                    {schoolCategory === "general" ? <option value="">선택 안 함</option> : null}
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
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
            <p className="text-muted-foreground text-sm">불러오는 중...</p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
              <Table className="min-w-[520px]">
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
                      <TableHead>학기</TableHead>
                      <TableHead>구분</TableHead>
                      <TableHead>과목명</TableHead>
                      <TableHead>석차등급·성취</TableHead>
                      <TableHead>원점수/평균</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "MOCK_EXAM" ? 5 : 5}>
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
                        <TableCell>{record.semester ?? record.exam_date}</TableCell>
                        <TableCell>
                          {record.subject_category &&
                          record.subject_category in SUBJECT_CATEGORY_LABEL
                            ? SUBJECT_CATEGORY_LABEL[record.subject_category]
                            : "-"}
                        </TableCell>
                        <TableCell>{record.subject_name ?? "-"}</TableCell>
                        <TableCell>
                          {[record.school_grade != null ? `등급 ${record.school_grade}` : null, record.achievement_level ?? null]
                            .filter(Boolean)
                            .join(" · ") || "-"}
                        </TableCell>
                        <TableCell>
                          {record.raw_score ?? "-"} / {record.avg_score ?? "-"}
                        </TableCell>
                      </TableRow>
                    ),
                  )
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
