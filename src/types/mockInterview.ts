export type InterviewType = "서류기반" | "MMI" | "교직인적성";

export type MockInterviewRow = {
  id: string;
  student_id: string;
  target_univ: string;
  interview_type: InterviewType;
  question: string;
  answer: string | null;
  feedback: string | null;
  created_at: string;
};

export type MockInterviewQuestionsDonePayload = {
  finish_reason: "stop" | "no_context" | "no_guidelines";
};

export type MockInterviewFeedbackDonePayload = {
  finish_reason: "stop";
};
