"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SignalLight } from "@/components/signals/SignalLight";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SignalScanRow } from "@/lib/signals/buildAdmissionSignalRows";

function formatGap(gap: number, admissionType: string): string {
  const decimals = Math.abs(gap) < 10 ? 2 : 1;
  const n = gap.toFixed(decimals);
  const sign = gap > 0 ? "+" : "";
  const unit = admissionType === "정시" ? "점" : "등급";
  return `${sign}${n}${unit}`;
}

const PAGE_SIZE = 50;

export type ExploreTableProps = {
  rows: SignalScanRow[];
  loading: boolean;
  durationMs: number | null;
  total: number;
};

export function ExploreTable({ rows, loading, durationMs, total }: ExploreTableProps) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount - 1);
  const slice = useMemo(() => {
    const start = effectivePage * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, effectivePage]);

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          결과 <span className="text-foreground font-medium">{total}</span>건
          {durationMs != null ? ` · 응답 ${durationMs}ms` : ""}
        </span>
        {rows.length > PAGE_SIZE ? (
          <span className="tabular-nums">
            {effectivePage + 1} / {pageCount} 페이지
          </span>
        ) : null}
      </div>

      {total === 0 && !loading ? (
        <div
          className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground"
          role="status"
        >
          조건에 맞는 전형이 없습니다.{" "}
          <span className="text-foreground font-medium">조건을 완화해 보세요.</span>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>대학명</TableHead>
              <TableHead>전형명</TableHead>
              <TableHead className="hidden md:table-cell">계열</TableHead>
              <TableHead className="text-right">컷오프</TableHead>
              <TableHead className="text-right">내 점수</TableHead>
              <TableHead>신호등</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-10 text-center text-sm">
                  불러오는 중입니다…
                </TableCell>
              </TableRow>
            ) : slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-6 text-center text-sm">
                  표시할 행이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              slice.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.university_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{r.admission_name}</TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{r.track}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.med_shift_applied ? (
                      <span title="보정 적용 컷">
                        {r.adjusted_cutoff.toFixed(2)}
                        <span className="text-muted-foreground text-xs">*</span>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {rows.length > PAGE_SIZE && !loading ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={effectivePage <= 0}
            onClick={() => setPage((p) => Math.max(0, Math.min(p, pageCount - 1) - 1))}
          >
            이전
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={effectivePage >= pageCount - 1}
            onClick={() =>
              setPage((p) => Math.min(pageCount - 1, Math.min(p, pageCount - 1) + 1))
            }
          >
            다음
          </Button>
        </div>
      ) : null}
    </div>
  );
}
