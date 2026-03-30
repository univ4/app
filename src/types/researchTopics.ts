export type ResearchDifficulty = "상" | "중" | "하";

export type ResearchTopicCard = {
  /** 1-based index from heading or parser */
  index: number;
  title: string;
  linkedSubject: string;
  difficulty: ResearchDifficulty | "";
  durationLabel: string;
  direction: string;
  univLink: string;
};

export type ResearchTopicsDonePayload = {
  finish_reason: "stop" | "no_context" | "no_guidelines";
  topics: ResearchTopicCard[];
};
