import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  variant?: "inline" | "banner";
};

export function ErrorState({ message, onRetry, variant = "inline" }: ErrorStateProps) {
  const wrapperClass =
    variant === "banner"
      ? "mb-2 rounded-md border border-border bg-card px-3 py-2"
      : "rounded-md border border-border bg-card px-4 py-3";

  return (
    <div className={wrapperClass} role="alert">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">{message}</p>
          {onRetry ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={onRetry}
              className="mt-2 min-h-9"
            >
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
              재시도
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
