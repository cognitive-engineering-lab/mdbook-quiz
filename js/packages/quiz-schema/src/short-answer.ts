import type { Markdown, QuestionFields } from "./common";

export interface ShortAnswerPrompt {
  /** The text of the prompt. */
  prompt: Markdown;

  /** Format of the response. */
  response?: "short" | "long" | "code";
}

export interface ShortAnswerAnswer {
  /** The exact string that answers the question. */
  answer: string;

  /** Other acceptable strings answers. */
  alternatives?: string[];
}

export type ShortAnswer = QuestionFields<
  "ShortAnswer",
  ShortAnswerPrompt,
  ShortAnswerAnswer
>;
