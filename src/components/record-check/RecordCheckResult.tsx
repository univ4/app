import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecordGapItem, RecordGapStatus } from "@/lib/calculators/calcRecordGapAnalysis";

function statusIcon(status: RecordGapStatus): string {
  switch (status) {
    case "critical":
      return "🔴";
    case "warning":
      return "⚠️";
    case "good":
      return "✅";
    default:
      return "";
  }
}

function formatCurrent(item: RecordGapItem): string {
  if (item.section === "수상경력") {
    return `${item.currentLength}건`;
  }
  if (item.currentLength === 0 && item.status === "critical") {
    return "미입력";
  }
  return `${item.currentLength}자`;
}

export interface RecordCheckResultProps {
  items: RecordGapItem[];
  overallScore: number;
}

export function RecordCheckResult({ items, overallScore }: RecordCheckResultProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">항목</TableHead>
              <TableHead className="w-[22%]">현황</TableHead>
              <TableHead>판정</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow
                key={row.section}
                className={
                  row.status === "critical"
                    ? "bg-red-50/80 dark:bg-red-950/20"
                    : row.status === "warning"
                      ? "bg-amber-50/60 dark:bg-amber-950/15"
                      : undefined
                }
              >
                <TableCell className="font-medium">{row.section}</TableCell>
                <TableCell className="text-muted-foreground">{formatCurrent(row)}</TableCell>
                <TableCell>
                  <span className="mr-2" aria-hidden>
                    {statusIcon(row.status)}
                  </span>
                  <span className="text-sm">{row.message}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm font-medium text-foreground">
        진로 일관성 점수:{" "}
        <span className="tabular-nums text-primary">{overallScore}</span>
        /100점
      </p>
    </div>
  );
}
