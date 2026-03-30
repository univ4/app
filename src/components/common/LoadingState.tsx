import { Loader2 } from "lucide-react";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "불러오는 중..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
