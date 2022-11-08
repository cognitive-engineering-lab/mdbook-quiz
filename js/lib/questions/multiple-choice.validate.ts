import { MultipleChoiceAnswer, MultipleChoicePrompt } from "./multiple-choice";
import { Validator } from "./validate";

export let validateMultipleChoice: Validator<
  MultipleChoicePrompt,
  MultipleChoiceAnswer
> = async prompt => {
  if (prompt.answerIndex && prompt.answerIndex > prompt.distractors.length) {
    return "answerIndex is out of bounds";
  }
};
