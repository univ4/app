"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

export type SubjectProfileFormValues = {
  korean_subject: "언어와매체" | "화법과작문";
  math_subject: "미적분" | "기하" | "확률과통계";
  science1: string;
  science2: string;
  social1: string;
  social2: string;
  second_foreign: string;
};

const defaultValues: SubjectProfileFormValues = {
  korean_subject: "언어와매체",
  math_subject: "미적분",
  science1: "",
  science2: "",
  social1: "",
  social2: "",
  second_foreign: "",
};

type ApiOk = {
  data: { id: string; updated_at: string };
  error: null;
};
type ApiErr = { data: null; error: { code: string; message: string } };

function toForm(
  p: {
    korean_subject: string;
    math_subject: string;
    science1: string | null;
    science2: string | null;
    social1: string | null;
    social2: string | null;
    second_foreign: string | null;
  } | null,
): SubjectProfileFormValues {
  if (!p) return { ...defaultValues };
  return {
    korean_subject: p.korean_subject as SubjectProfileFormValues["korean_subject"],
    math_subject: p.math_subject as SubjectProfileFormValues["math_subject"],
    science1: p.science1 ?? "",
    science2: p.science2 ?? "",
    social1: p.social1 ?? "",
    social2: p.social2 ?? "",
    second_foreign: p.second_foreign ?? "",
  };
}

export function SubjectProfileForm({
  initialProfile,
  onSaved,
}: {
  initialProfile: Parameters<typeof toForm>[0];
  onSaved?: () => void;
}) {
  const [values, setValues] = useState<SubjectProfileFormValues>(() => toForm(initialProfile));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(toForm(initialProfile));
  }, [initialProfile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/subject-analysis/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          korean_subject: values.korean_subject,
          math_subject: values.math_subject,
          science1: values.science1.trim() || null,
          science2: values.science2.trim() || null,
          social1: values.social1.trim() || null,
          social2: values.social2.trim() || null,
          second_foreign: values.second_foreign.trim() || null,
        }),
      });
      const body = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || body.error) {
        setError(body.error?.message ?? "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다.");
      onSaved?.();
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>수능 선택과목 프로필</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="korean_subject">국어 선택과목</Label>
              <select
                id="korean_subject"
                className={selectClass}
                value={values.korean_subject}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    korean_subject: e.target.value as SubjectProfileFormValues["korean_subject"],
                  }))
                }
              >
                <option value="언어와매체">언어와매체</option>
                <option value="화법과작문">화법과작문</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="math_subject">수학 선택과목</Label>
              <select
                id="math_subject"
                className={selectClass}
                value={values.math_subject}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    math_subject: e.target.value as SubjectProfileFormValues["math_subject"],
                  }))
                }
              >
                <option value="미적분">미적분</option>
                <option value="기하">기하</option>
                <option value="확률과통계">확률과통계</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="science1">탐구 1 (과학·사회 등)</Label>
              <Input
                id="science1"
                placeholder="예: 지구과학Ⅰ"
                value={values.science1}
                onChange={(e) => setValues((v) => ({ ...v, science1: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="science2">탐구 2</Label>
              <Input
                id="science2"
                placeholder="예: 생명과학Ⅰ"
                value={values.science2}
                onChange={(e) => setValues((v) => ({ ...v, science2: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="social1">추가 탐구 1 (선택)</Label>
              <Input
                id="social1"
                placeholder="사회·직업 등"
                value={values.social1}
                onChange={(e) => setValues((v) => ({ ...v, social1: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social2">추가 탐구 2 (선택)</Label>
              <Input
                id="social2"
                value={values.social2}
                onChange={(e) => setValues((v) => ({ ...v, social2: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="second_foreign">제2외국어 (선택)</Label>
            <Input
              id="second_foreign"
              value={values.second_foreign}
              onChange={(e) => setValues((v) => ({ ...v, second_foreign: e.target.value }))}
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {message ? <p className="text-muted-foreground text-sm">{message}</p> : null}

          <Button type="submit" disabled={saving}>
            {saving ? "저장 중…" : "프로필 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
