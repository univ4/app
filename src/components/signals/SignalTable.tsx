"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdmissionSignalTier } from "@/lib/calculators/calcAdmissionSignal";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";
import type { UnivRegionBucket } from "@/lib/signals/univRegion";

import { SignalLight } from "./SignalLight";

export type AdmissionTypeFilter = "all" | "정시" | "학생부교과" | "학생부종합";
export type SignalFilter = "all" | AdmissionSignalTier;
export type RegionFilter = "all" | "seoul" | "capital" | "nationwide";

function formatGap(gap: number, admissionType: string): string {
  const decimals = Math.abs(gap) < 10 ? 2 : 1;
  const n = gap.toFixed(decimals);
  const sign = gap > 0 ? "+" : "";
  const unit = admissionType === "정시" ? "점" : "등급";
  return `${sign}${n}${unit}`;
}

function regionMatch(rowRegion: UnivRegionBucket, filter: RegionFilter): boolean {
  if (filter === "all" || filter === "nationwide") return true;
  if (filter === "seoul") return rowRegion === "seoul";
  if (filter === "capital") return rowRegion === "seoul" || rowRegion === "capital";
  return true;
}

export type SignalTableProps = {
  rows: SignalScanRow[];
  loading: boolean;
  error: string | null;
  meta: {
    duration_ms: number;
    row_count: number;
    unique_universities: number;
    med_shift_enabled: boolean;
    has_mock_exam: boolean;
    has_school_gpa: boolean;
  } | null;
  medShiftEnabled: boolean;
  onMedShiftChange: (enabled: boolean) => void;
  onScan: () => void;
};

export function SignalTable({
  rows,
  loading,
  error,
  meta,
  medShiftEnabled,
  onMedShiftChange,
  onScan,
}: SignalTableProps) {
  const [admissionType, setAdmissionType] = useState<AdmissionTypeFilter>("all");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (admissionType !== "all" && r.admission_type !== admissionType) return false;
      if (signalFilter !== "all" && r.signal !== signalFilter) return false;
      if (!regionMatch(r.region, region)) return false;
      return true;
    });
  }, [rows, admissionType, signalFilter, region]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <CardTitle>합격 가능성 신호등</CardTitle>
            </div>
            <Button type="button" onClick={onScan} disabled={loading} className="w-full sm:w-auto">
              {loading ? "스캔 중…" : "전체 대학 스캔"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            매뉴얼 §3 — 입결 컷과 내 성적을 비교해 안정·적정·도전을 표시합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label
              htmlFor="med-shift"
              className="flex min-h-11 cursor-pointer items-center gap-3 py-1 sm:min-h-0"
            >
              <input
                id="med-shift"
                type="checkbox"
                checked={medShiftEnabled}
                onChange={(e) => onMedShiftChange(e.target.checked)}
                className="size-5 shrink-0 rounded border border-input sm:size-4"
              />
              <span className="text-sm font-normal">
                의대 증원 보정 (행별 <code className="text-xs">med_shift_coeff</code> 반영)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">전형 유형</Label>
              <select
                className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
                value={admissionType}
                onChange={(e) => setAdmissionType(e.target.value as AdmissionTypeFilter)}
              >
                <option value="all">전체</option>
                <option value="학생부교과">학생부교과</option>
                <option value="학생부종합">학생부종합</option>
                <option value="정시">정시</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">신호등</Label>
              <select
                className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
                value={signalFilter}
                onChange={(e) => setSignalFilter(e.target.value as SignalFilter)}
              >
                <option value="all">모두</option>
                <option value="safe">안정만</option>
                <option value="moderate">적정만</option>
                <option value="challenge">도전만</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">지역</Label>
              <select
                className="border-input bg-background min-h-11 rounded-md border px-2 text-sm sm:h-9 sm:min-h-9"
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
              >
                <option value="all">전국</option>
                <option value="seoul">서울</option>
                <option value="capital">수도권</option>
              </select>
            </div>
          </div>

          {error ? <ErrorState message={error} onRetry={onScan} /> : null}

          {meta ? (
            <p className="text-xs text-muted-foreground">
              스캔 {meta.row_count}행 · 고유 대학 약 {meta.unique_universities}개 · 응답 {meta.duration_ms}
              ms
              {!meta.has_mock_exam ? " · 정시 행: 최신 모의고사 없음" : ""}
              {!meta.has_school_gpa ? " · 교과·종합: 내신 행 없음(가능 시 전체 평균 등급만)" : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <CardContent className="p-0">
          {loading ? <LoadingState message="합격 가능성 데이터를 불러오는 중..." /> : null}
          {!loading && filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="조건에 맞는 결과가 없습니다"
                description="전체 대학 스캔을 실행하거나 필터를 변경해 보세요."
                action={
                  <Button type="button" variant="outline" onClick={onScan}>
                    전체 대학 스캔
                  </Button>
                }
              />
            </div>
          ) : null}
          {!loading && filtered.length > 0 ? (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>대학명</TableHead>
                  <TableHead>전형명</TableHead>
                  <TableHead className="hidden md:table-cell">계열</TableHead>
                  <TableHead className="text-right">컷오프</TableHead>
                  <TableHead className="text-right">내 점수</TableHead>
                  <TableHead>신호등 · 확률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.university_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.admission_name}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{r.track}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.med_shift_applied ? (
                        <span title="보정 적용 컷">
                          {r.adjusted_cutoff.toFixed(2)}
                          <span className="text-xs text-muted-foreground">*</span>
                        </span>
                      ) : (
                        r.cutoff.toFixed(2)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.my_score.toFixed(2)}</TableCell>
                    <TableCell>
                      <SignalLight
                        signal={r.signal}
                        probabilityPercent={r.probability_percent}
                        gapLabel={formatGap(r.gap, r.admission_type)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
