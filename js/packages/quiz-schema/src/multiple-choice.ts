import type { Markdown, QuestionFields } from "./common";

export interface MultipleChoicePrompt {
  /** The text of the prompt. */
  prompt: Markdown;

  /** An array of incorrect answers. */
  distractors: Markdown[];

  /** If defined, don't randomize distractors and put answer at this index. */
  answerIndex?: number;
}

export interface MultipleChoiceAnswer {
  /** The text of the correct answer. */
  answer: Markdown | Markdown[];
}

export type MultipleChoice = QuestionFields<
  "MultipleChoice",
  MultipleChoicePrompt,
  MultipleChoiceAnswer
>;
