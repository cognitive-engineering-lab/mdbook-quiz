import React from "react";

export type Markdown = string;

export interface Question<Type extends string, Prompt, Answer> {
  type: Type;
  prompt: Prompt;
  answer: Answer;
  context?: Markdown;
}

export interface QuestionMethods<Prompt, Answer> {
  PromptView: React.FC<{ prompt: Prompt }>;
  ResponseView: React.FC<{ submit: () => void }>;
  getAnswerFromDOM(data: FormData, container: HTMLFormElement): Answer;
  AnswerView: React.FC<{ answer: Answer }>;
  compareAnswers?(providedAnswer: Answer, userAnswer: Answer): boolean;
}
