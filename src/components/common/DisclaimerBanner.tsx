type DisclaimerVariant = "calculation" | "ai" | "data";

type DisclaimerBannerProps = {
  variant: DisclaimerVariant;
  showDetail?: boolean;
};

const DISCLAMER_MESSAGES: Record<DisclaimerVariant, string> = {
  calculation:
    "본 계산 결과는 참고용이며, 최종 지원 결정 전 반드시 해당 대학 공식 입학처 홈페이지의 모집요강을 직접 확인하시기 바랍니다.",
  ai: "본 내용은 AI가 생성한 참고 자료입니다. 대입 관련 중요 결정은 반드시 공식 자료를 확인하고 입시 전문가와 상담하시기 바랍니다.",
  data: "본 서비스의 입결 데이터는 각 대학이 발표한 전형 결과를 기반으로 합니다. 실제 입결과 차이가 있을 수 있습니다.",
};

const DETAIL_BY_VARIANT: Record<DisclaimerVariant, string> = {
  calculation: "계산 결과는 입력값, 연도별 데이터 수집 범위, 대학별 전형 규칙 변경에 따라 달라질 수 있습니다.",
  ai: "AI 응답은 참고 해석이며, 실제 전형 판단은 모집요강 원문과 학교·전문가 확인을 우선해야 합니다.",
  data: "공시 시점/집계 기준 차이, 대학 공개 방식 변경 등으로 인해 실제 지원 환경과 일부 차이가 발생할 수 있습니다.",
};

export function DisclaimerBanner({ variant, showDetail = false }: DisclaimerBannerProps) {
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>{DISCLAMER_MESSAGES[variant]}</p>
      {showDetail ? <p className="mt-2 text-xs text-amber-800">{DETAIL_BY_VARIANT[variant]}</p> : null}
    </section>
  );
}
