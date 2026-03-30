import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "대시보드",
  rightSlot,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 break-words text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 size-4" aria-hidden />
            {backLabel}
          </Link>
        </Button>
        {rightSlot}
      </div>
    </div>
  );
}
