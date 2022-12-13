import { MultipleChoice } from "./multiple-choice";
import { ShortAnswer } from "./short-answer";
import { Tracing } from "./tracing";

export * from "./multiple-choice";
export * from "./short-answer";
export * from "./tracing";
export * from "./common";

export type Question = ShortAnswer | Tracing | MultipleChoice;

export interface Quiz {
  questions: Question[];
}
