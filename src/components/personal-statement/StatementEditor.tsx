"use client";

import { Save } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUIDELINE_PLAN_UNIV_NAMES } from "@/lib/chat/guidelineUnivOptions";
import type { PersonalStatementRow } from "@/types/personalStatement";

export type StatementEditorProps = {
  items: PersonalStatementRow[];
  onSaved: (row: PersonalStatementRow) => void;
  onRefresh: () => Promise<void>;
  /** 저장 또는 목록 선택 시 피드백에 사용할 statement id */
  onActiveStatementChange?: (id: string | null) => void;
};

export function StatementEditor({
  items,
  onSaved,
  onRefresh,
  onActiveStatementChange,
}: StatementEditorProps) {
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [university, setUniversity] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [questionText, setQuestionText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [maxLength, setMaxLength] = useState(1500);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const charCount = draftText.length;
  const overLimit = charCount > maxLength;

  const loadRow = useCallback(
    (row: PersonalStatementRow) => {
      setSelectedId(row.id);
      setUniversity(row.university);
      setQuestionNumber(row.question_number);
      setQuestionText(row.question_text);
      setDraftText(row.draft_text);
      setMaxLength(row.max_length);
      onActiveStatementChange?.(row.id);
    },
    [onActiveStatementChange],
  );

  const resetNew = useCallback(() => {
    setSelectedId("new");
    setUniversity("");
    setQuestionNumber(1);
    setQuestionText("");
    setDraftText("");
    setMaxLength(1500);
    onActiveStatementChange?.(null);
  }, [onActiveStatementChange]);

  const applySelection = useCallback(
    (value: string) => {
      if (value === "new") {
        resetNew();
        return;
      }
      const row = items.find((i) => i.id === value);
      if (row) loadRow(row);
    },
    [items, loadRow, resetNew],
  );

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      if (selectedId === "new") {
        const res = await fetch("/api/personal-statement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            university: university.trim() || "미지정",
            question_number: questionNumber,
            question_text: questionText.trim() || "(문항 없음)",
            draft_text: draftText,
            max_length: maxLength,
          }),
        });
        const j = (await res.json()) as {
          data?: { item?: PersonalStatementRow };
          error?: { message?: string };
        };
        if (!res.ok || !j.data?.item) {
          setSaveError(j.error?.message ?? `저장 실패 (${res.status})`);
          return;
        }
        onSaved(j.data.item);
        await onRefresh();
        loadRow(j.data.item);
      } else {
        const res = await fetch(`/api/personal-statement/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            university: university.trim() || "미지정",
            question_number: questionNumber,
            question_text: questionText.trim() || "(문항 없음)",
            draft_text: draftText,
            max_length: maxLength,
          }),
        });
        const j = (await res.json()) as {
          data?: { item?: PersonalStatementRow };
          error?: { message?: string };
        };
        if (!res.ok || !j.data?.item) {
          setSaveError(j.error?.message ?? `저장 실패 (${res.status})`);
          return;
        }
        onSaved(j.data.item);
        await onRefresh();
        loadRow(j.data.item);
      }
    } catch {
      setSaveError("네트워크 오류로 저장할 수 없습니다.");
    } finally {
      setSaving(false);
    }
  }, [
    selectedId,
    university,
    questionNumber,
    questionText,
    draftText,
    maxLength,
    onSaved,
    onRefresh,
    loadRow,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">자소서 초안</CardTitle>
        <CardDescription>
          대학·문항을 선택하고 초안을 작성합니다. 저장 후 아래에서 피드백을 받을 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ps-existing">저장된 초안</Label>
          <select
            id="ps-existing"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={selectedId}
            onChange={(e) => applySelection(e.target.value)}
            aria-label="저장된 자소서 선택"
          >
            <option value="new">새 초안</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.university} · 문항 {it.question_number} ·{" "}
                {it.updated_at.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ps-univ">대학</Label>
          <select
            id="ps-univ"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            aria-label="대학 선택"
          >
            <option value="">선택</option>
            {GUIDELINE_PLAN_UNIV_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ps-qnum">문항 번호</Label>
          <select
            id="ps-qnum"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={String(questionNumber)}
            onChange={(e) => setQuestionNumber(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                문항 {n}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ps-qtext">문항 내용</Label>
          <textarea
            id="ps-qtext"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-[88px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="대학 지원 시스템에 표시된 문항을 붙여넣으세요."
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor="ps-draft">초안</Label>
            <span
              className={
                overLimit
                  ? "text-destructive text-xs font-medium"
                  : "text-muted-foreground text-xs"
              }
              aria-live="polite"
            >
              {charCount} / {maxLength}자
              {overLimit ? " (제한 초과)" : ""}
            </span>
          </div>
          <textarea
            id="ps-draft"
            className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-[200px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="초안을 입력하세요."
          />
          {overLimit ? (
            <p className="text-destructive text-xs" role="alert">
              글자수 제한을 초과했습니다. 제출 전에 줄이거나 문항 제한에 맞춰 주세요.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ps-max">글자수 제한 (피드백 기준)</Label>
          <Input
            id="ps-max"
            type="number"
            min={100}
            max={20000}
            value={maxLength}
            onChange={(e) => setMaxLength(Number(e.target.value) || 1500)}
          />
        </div>

        {saveError ? (
          <div className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
            {saveError}
          </div>
        ) : null}

        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          <Save className="mr-2 size-4" aria-hidden />
          {saving ? "저장 중…" : "저장"}
        </Button>
      </CardContent>
    </Card>
  );
}
