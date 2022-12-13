import { validateMultipleChoice } from "./multiple-choice.validate";
import { validateTracing } from "./tracing.validate";

export type Validator<Prompt, Answer> = (
  prompt: Prompt,
  answer: Answer
) => Promise<string | undefined>;

export let questionValidators: {
  [key: string]: Validator<any, any>;
} = {
  Tracing: validateTracing,
  MultipleChoice: validateMultipleChoice,
};
