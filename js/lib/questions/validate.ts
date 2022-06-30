import type { Question } from "./mod";
import { validateTracing } from "./tracing.validate";

export type Validator<Prompt, Answer> = (
  prompt: Prompt,
  answer: Answer
) => Promise<string | undefined>;

export let questionValidators: { [key in Question["type"]]?: Validator<any, any> } = {
  Tracing: validateTracing,
};
