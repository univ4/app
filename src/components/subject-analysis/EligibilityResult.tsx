"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EligibilityResult({
  eligibleUniversityCount,
  totalReferenceUniversities,
  universitiesWithRequirementData,
  ineligible,
}: {
  eligibleUniversityCount: number;
  totalReferenceUniversities: number;
  universitiesWithRequirementData: number;
  ineligible: { universityName: string; departmentName: string; reasons: string[] }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>지원 가능 필터링</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          <span className="font-medium text-foreground">지원 가능(요건 데이터 기준)</span>:{" "}
          <span className="font-mono">
            {eligibleUniversityCount}개 / {totalReferenceUniversities}개
          </span>
        </p>
        <p className="text-muted-foreground">
          대학별 선택과목 요건 DB에 등록된 대학{" "}
          <span className="font-mono">{universitiesWithRequirementData}</span>개에 대해 학과별로
          판정했습니다. 데이터가 없으면 집계에 포함되지 않습니다.
        </p>

        {ineligible.length > 0 ? (
          <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-3">
            <p className="text-destructive mb-2 font-medium">지원 불가·요건 미충족</p>
            <ul className="text-muted-foreground list-disc space-y-2 pl-5">
              {ineligible.map((row, i) => (
                <li key={`${row.universityName}-${row.departmentName}-${i}`}>
                  <span className="text-foreground font-medium">
                    {row.universityName} · {row.departmentName}
                  </span>
                  <ul className="mt-1 list-[circle] pl-4">
                    {row.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">
            등록된 요건으로 지원 불가로 판정된 학과가 없거나, 아직 요건 데이터가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
