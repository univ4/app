"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdvantageResult({
  advantageUnivs,
  disadvantageUnivs,
  neutralUnivs,
  summary,
}: {
  advantageUnivs: string[];
  disadvantageUnivs: string[];
  neutralUnivs: string[];
  summary: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>유불리 분석 (정시 반영비 기준)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{summary}</p>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-foreground mb-2 font-medium">유리한 대학</h3>
            {advantageUnivs.length > 0 ? (
              <ul className="text-muted-foreground list-disc pl-5">
                {advantageUnivs.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h3 className="text-foreground mb-2 font-medium">불리한 대학</h3>
            {disadvantageUnivs.length > 0 ? (
              <ul className="text-muted-foreground list-disc pl-5">
                {disadvantageUnivs.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <h3 className="text-foreground mb-2 font-medium">중립</h3>
            {neutralUnivs.length > 0 ? (
              <ul className="text-muted-foreground list-disc pl-5">
                {neutralUnivs.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
