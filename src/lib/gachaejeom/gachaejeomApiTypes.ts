import type { CalcGachaejeomScoreResult } from "@/lib/calculators/calcGachaejeomScore";

export type GachaejeomUnivResult = {
  university_name: string;
  major_group: string;
  admission_name: string;
  cutoff: number;
  adjusted_cutoff: number;
  converted_score: number;
  signal: "safe" | "moderate" | "challenge";
  probability_percent: number;
  gap: number;
  med_shift_applied: boolean;
};

export type GachaejeomApiSuccess = {
  estimatedScores: CalcGachaejeomScoreResult["estimatedScores"];
  warning: string;
  univResults: GachaejeomUnivResult[];
  meta: {
    admission_year: number;
    duration_ms: number;
    med_shift_enabled: boolean;
    universities_with_result: number;
  };
};
