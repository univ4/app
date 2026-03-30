"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";

const DISCLAIMER_TEXT = "통계적 예측값이며 실제 합격을 보장하지 않습니다";

export function UncertaintyBadge() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="참고 지표 안내 보기"
        className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Badge variant="outline" className="text-muted-foreground text-xs">
          참고 지표
        </Badge>
      </button>
      {open ? (
        <span
          role="tooltip"
          className="bg-popover text-popover-foreground absolute left-0 top-7 z-20 w-56 rounded-md border p-2 text-xs shadow-md"
        >
          {DISCLAIMER_TEXT}
        </span>
      ) : null}
    </span>
  );
}
