"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExamChunksSummary } from "@/lib/exam-analysis/getExamChunksSummary";

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-11 w-full min-h-11 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-h-9";

type MatchRow = {
  id: number;
  chunkText: string;
  similarity: number;
  univName: string;
  year: number;
  examType: string;
  deptName: string | null;
  metadata: Record<string, unknown>;
};

type ExamAnalysisViewProps = {
  initialSummary: ExamChunksSummary;
  summaryError: string | null;
};

export function ExamAnalysisView({
  initialSummary,
  summaryError,
}: ExamAnalysisViewProps) {
  const hasData = initialSummary.total > 0;

  const [examType, setExamType] = useState<"논술" | "면접">("논술");
  const [univName, setUnivName] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);

  const yearOptions = useMemo(
    () => initialSummary.years.map(String),
    [initialSummary.years],
  );

  const onSearch = useCallback(async () => {
    if (!query.trim()) {
      setError("질문을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          examType,
          univName: univName || undefined,
          year: year ? Number(year) : undefined,
        }),
      });
      const body = (await res.json()) as {
        data?: { matches?: MatchRow[] };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(body.error?.message ?? "검색에 실패했습니다.");
        setMatches([]);
        return;
      }
      setMatches(body.data?.matches ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [query, examType, univName, year]);

  if (summaryError) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>데이터를 불러오지 못했습니다</CardTitle>
          <CardDescription>{summaryError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>논술/면접 기출 분석 기능 준비 중</CardTitle>
          <CardDescription>
            이 기능이 동작하려면 아래 데이터가 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="mb-2 font-medium text-foreground">필요 데이터</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                대학별 논술 기출 문제 PDF (연세대, 고려대, 성균관대, 한양대 등)
              </li>
              <li>대학별 면접 기출 질문 목록 (서울대, 연세대 의대 MMI 등)</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">데이터 준비 방법</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>각 대학 입학처에서 기출 문제 PDF 수집</li>
              <li>
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  scripts/ingest/embed_exam_chunks.ts
                </code>{" "}
                실행
              </li>
              <li>페이지 새로고침</li>
            </ol>
          </div>
          <p className="text-foreground">
            준비된 데이터: {initialSummary.univCount}개 대학 / {initialSummary.total}건
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>유사 기출 검색</CardTitle>
          <CardDescription>
            대학·전형(논술/면접)·연도를 선택한 뒤 질문을 입력하면 RAG로 유사한
            기출 청크를 찾습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="exam-type">전형</Label>
              <select
                id="exam-type"
                className={selectClass}
                value={examType}
                onChange={(e) =>
                  setExamType(e.target.value === "면접" ? "면접" : "논술")
                }
              >
                <option value="논술">논술</option>
                <option value="면접">면접</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="univ">대학</Label>
              <select
                id="univ"
                className={selectClass}
                value={univName || ""}
                onChange={(e) => setUnivName(e.target.value)}
              >
                <option value="">전체</option>
                {initialSummary.univNames.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">연도</Label>
              <select
                id="year"
                className={selectClass}
                value={year || ""}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">전체</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="q">질문</Label>
              <Input
                id="q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 인공지능 윤리에 대한 자신의 견해를 서술하시오."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSearch();
                  }
                }}
              />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" onClick={() => void onSearch()} disabled={loading}>
            {loading ? "검색 중…" : "유사 기출 검색"}
          </Button>
        </CardContent>
      </Card>

      {matches !== null && matches.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            조건에 맞는 유사 기출을 찾지 못했습니다. 필터를 넓히거나 질문을 바꿔
            보세요.
          </CardContent>
        </Card>
      ) : null}

      {matches !== null && matches.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">검색 결과</h2>
          {matches.map((m) => {
            const meta = m.metadata ?? {};
            const sourceFile =
              typeof meta.source_file === "string" ? meta.source_file : null;
            const pageSection =
              typeof meta.page_section === "string" ? meta.page_section : null;
            const citationHint =
              typeof meta.citation_hint === "string"
                ? meta.citation_hint
                : null;
            return (
              <Card key={m.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <CardTitle className="text-base">
                      {m.univName} · {m.year} · {m.examType}
                      {m.deptName ? ` · ${m.deptName}` : ""}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      유사도 {(m.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    출처:{" "}
                    {[sourceFile, pageSection, citationHint]
                      .filter(Boolean)
                      .join(" · ") || "메타데이터 없음"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {m.chunkText}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
