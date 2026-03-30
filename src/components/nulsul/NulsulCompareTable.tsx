"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type NulsulCompareRow = {
  rowKey: string;
  univ_name: string;
  dept_name: string;
  year: number;
  nominalRate: number;
  suneungMinimumRate: number;
  absenceRate: number;
  realRate: number;
  diffRate: number;
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
}

export function NulsulCompareTable({
  rows,
  onRemove,
}: {
  rows: NulsulCompareRow[];
  onRemove: (rowKey: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        비교 표에 추가한 전형이 없습니다. 위에서 전형을 고른 뒤 &quot;비교 표에 추가&quot;를 누르세요.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>대학</TableHead>
            <TableHead>모집단위</TableHead>
            <TableHead className="text-right">명목 경쟁률</TableHead>
            <TableHead className="text-right">실질 경쟁률</TableHead>
            <TableHead className="text-right">차이(명목−실질)</TableHead>
            <TableHead className="text-right">최저충족</TableHead>
            <TableHead className="text-right">결시율</TableHead>
            <TableHead className="w-[72px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.rowKey}>
              <TableCell className="font-medium">{r.univ_name}</TableCell>
              <TableCell className="max-w-[200px] truncate" title={r.dept_name}>
                {r.dept_name}
              </TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.nominalRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.realRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.diffRate)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {(r.suneungMinimumRate * 100).toFixed(0)}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {(r.absenceRate * 100).toFixed(0)}%
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(r.rowKey)}>
                  제거
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
