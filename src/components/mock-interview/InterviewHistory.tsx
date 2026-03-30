"use client";

import { useCallback, useEffect, useState } from "react";

import type { MockInterviewRow } from "@/types/mockInterview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type InterviewHistoryProps = {
  refreshToken: number;
};

export function InterviewHistory({ refreshToken }: InterviewHistoryProps) {
  const [items, setItems] = useState<MockInterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mock-interview", {
        credentials: "same-origin",
      });
      const j = (await res.json()) as {
        data?: { items?: MockInterviewRow[] };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(j?.error?.message ?? `목록을 불러오지 못했습니다 (${res.status})`);
        setItems([]);
        return;
      }
      setItems(j.data?.items ?? []);
    } catch {
      setError("네트워크 오류로 목록을 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  if (loading && items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">기록을 불러오는 중…</p>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">저장된 모의 면접 기록이 없습니다.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {row.target_univ} · {row.interview_type}
            </CardTitle>
            <CardDescription>
              {new Date(row.created_at).toLocaleString("ko-KR")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground font-medium">질문</span>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                {row.question}
              </pre>
            </div>
            {row.answer ? (
              <div>
                <span className="text-muted-foreground font-medium">답변</span>
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                  {row.answer}
                </pre>
              </div>
            ) : null}
            {row.feedback ? (
              <div>
                <span className="text-muted-foreground font-medium">피드백</span>
                <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                  {row.feedback}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
