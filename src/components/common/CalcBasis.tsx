type CalcBasisProps = {
  dataSource: string;
  formula?: string;
  year?: number;
  collapsible?: boolean;
};

export function CalcBasis({ dataSource, formula, year, collapsible = true }: CalcBasisProps) {
  const content = (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p>데이터 출처: {dataSource}</p>
      {typeof year === "number" ? <p>기준 연도: {year}학년도</p> : null}
      {formula ? <p>계산 방식: {formula}</p> : null}
    </div>
  );

  if (!collapsible) {
    return (
      <section className="rounded-lg border bg-card px-4 py-3">
        <p className="mb-2 text-sm font-medium text-foreground">계산 근거</p>
        {content}
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card px-4 py-3">
      <details>
        <summary className="cursor-pointer text-sm font-medium text-foreground">계산 근거 ▼</summary>
        <div className="mt-2">{content}</div>
      </details>
    </section>
  );
}
