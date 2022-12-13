import {
  MultipleChoiceAnswer,
  MultipleChoicePrompt,
} from "@wcrichto/quiz-schema";

import { Validator } from "./validators";

export let validateMultipleChoice: Validator<
  MultipleChoicePrompt,
  MultipleChoiceAnswer
> = async prompt => {
  if (prompt.answerIndex && prompt.answerIndex > prompt.distractors.length) {
    return "answerIndex is out of bounds";
  }
};
