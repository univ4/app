"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ProbabilitySignalItem = {
  university: string;
  major_group: string;
  converted_score: number;
  cutline_70: number;
  probability: "안정" | "적정" | "도전";
  discount_applied: boolean;
  discount_reason: string;
};

function ProbabilityBadge({
  probability,
}: {
  probability: ProbabilitySignalItem["probability"];
}) {
  if (probability === "안정") {
    return (
      <Badge className="bg-green-500 text-white hover:bg-green-500" variant="default">
        안정권
      </Badge>
    );
  }

  if (probability === "적정") {
    return (
      <Badge className="bg-yellow-500 text-black hover:bg-yellow-500" variant="default">
        적정권
      </Badge>
    );
  }

  return (
    <Badge className="bg-red-500 text-white hover:bg-red-500" variant="default">
      도전권
    </Badge>
  );
}

export function ProbabilitySignal({
  items,
  admissionType,
}: {
  items: ProbabilitySignalItem[];
  admissionType: "정시" | "학생부교과" | string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {items.map((item) => {
        const diff = item.converted_score - item.cutline_70;
        const diffText = `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`;

        return (
          <Card key={item.university} className="w-full">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{item.university}</CardTitle>
                <ProbabilityBadge probability={item.probability} />
              </div>
              <div className="text-sm text-muted-foreground">
                전형: {admissionType} / 계열: {item.major_group}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                환산점수: <b>{item.converted_score.toFixed(2)}</b>
              </div>
              <div>
                70%컷: <b>{item.cutline_70.toFixed(2)}</b>
              </div>
              <div>
                점수 차이: <b>{diffText}</b>
              </div>
              <div>
                보정 적용 여부:{" "}
                <b>{item.discount_applied ? "적용됨" : "미적용"}</b>
              </div>
              {item.discount_applied && item.discount_reason ? (
                <div className="text-xs text-muted-foreground">
                  {item.discount_reason}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

