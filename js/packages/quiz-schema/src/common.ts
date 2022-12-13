export type Markdown = string;

export interface QuestionFields<Type extends string, Prompt, Answer> {
  id?: string;
  type: Type;
  prompt: Prompt;
  answer: Answer;
  context?: Markdown;
  promptExplanation?: boolean;
}
