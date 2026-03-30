export type GapAnalysisSectionKey = "strengths" | "gaps" | "actions";

export type GapAnalysisSection = {
  key: GapAnalysisSectionKey;
  title: string;
  content: string;
};

export type GapAnalysisDonePayload = {
  finish_reason: "stop" | "no_context" | "no_guidelines";
  sections: GapAnalysisSection[];
};
