"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ZScoreSubjectRow = {
  id: number;
  semester: string | null;
  subjectName: string | null;
  subjectCategory: string | null;
  zScore: number | null;
  bandLabel: string | null;
  omitReason: string | null;
};

export type ZScoreSchoolLevel = {
  avgZScore: number;
  levelLabel: string;
  subjectZScores: { subjectName: string; zScore: number }[];
  disclaimer: string;
};

export type ZScoreDisplayData = {
  subjects: ZScoreSubjectRow[];
  schoolLevel: ZScoreSchoolLevel;
};

const CATEGORY_LABEL: Record<string, string> = {
  general: "보통교과",
  career_choice: "진로선택",
  pe_art: "체육·예술",
};

export function ZScoreDisplay({ data }: { data: ZScoreDisplayData | null }) {
  if (!data) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Z점수 (교내 상대 위치)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Z점수 정보를 불러오지 못했습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyZ = data.subjects.some((s) => s.zScore !== null);
  const computedCount = data.schoolLevel.subjectZScores.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Z점수 (교내 상대 위치)</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          계산식: Z = (원점수 − 과목평균) ÷ 표준편차. 결과는{" "}
          <strong className="font-medium text-foreground">학생부종합 참고지표</strong>로만 표시되며,{" "}
          <strong className="font-medium text-foreground">자동 판정·합격 판별에는 사용되지 않습니다</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/40 rounded-md border p-3 text-xs">
          <p className="font-medium text-foreground">해석 참고 (과목·전체 평균 Z 공통)</p>
          <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5">
            <li>Z &gt; 1.5 → 상위권</li>
            <li>0 ≤ Z ≤ 1.5 → 중위권</li>
            <li>Z &lt; 0 → 하위권</li>
          </ul>
        </div>

        {!hasAnyZ && data.subjects.length === 0 ? (
          <p className="text-muted-foreground text-sm">내신 성적을 먼저 저장하면 Z점수를 계산합니다.</p>
        ) : null}

        {!hasAnyZ && data.subjects.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            원점수·과목평균·표준편차·수강자수가 모두 있는 과목만 Z점수를 표시합니다. (체육·예술 등 일부 구분은 해당 항목이 없을 수 있습니다.)
          </p>
        ) : null}

        {computedCount > 0 ? (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">과목 평균 Z점수: </span>
              <span className="font-medium tabular-nums">{data.schoolLevel.avgZScore}</span>
              {data.schoolLevel.levelLabel === "판별 불가" ? null : (
                <>
                  {" "}
                  <span className="text-muted-foreground">· 추정 밴드: </span>
                  <span className="font-medium">{data.schoolLevel.levelLabel}</span>
                </>
              )}
            </p>
            <p className="text-muted-foreground text-xs">{data.schoolLevel.disclaimer}</p>
          </div>
        ) : null}

        {data.subjects.length > 0 ? (
          <div className="-mx-4 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow>
                  <TableHead>학기</TableHead>
                  <TableHead>구분</TableHead>
                  <TableHead>과목</TableHead>
                  <TableHead className="text-right">Z점수</TableHead>
                  <TableHead>참고 밴드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subjects.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.semester ?? "—"}</TableCell>
                    <TableCell>
                      {row.subjectCategory && row.subjectCategory in CATEGORY_LABEL
                        ? CATEGORY_LABEL[row.subjectCategory]
                        : "—"}
                    </TableCell>
                    <TableCell>{row.subjectName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.zScore !== null ? row.zScore : "—"}
                    </TableCell>
                    <TableCell>
                      {row.bandLabel ?? (row.omitReason ? <span className="text-muted-foreground text-xs">{row.omitReason}</span> : "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
          고교 학력 밀집도 추정은 과목별 Z의 평균으로 요약한 참고값입니다. 대학 전형·내신 등급 산출과는 별개이며, 근거는 교과 성적표에 입력한 평균·표준편차입니다.
        </p>
      </CardContent>
    </Card>
  );
}
