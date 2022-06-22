import React from "react";

export interface Question<Type extends string, Prompt, Answer> {
  type: Type;
  prompt: Prompt;
  answer: Answer;
  context?: string;
}

export interface QuestionViews<Prompt, Answer> {
  PromptView: React.FC<{ prompt: Prompt }>;
  ResponseView: React.FC<{ submit: () => void }>;
  getAnswerFromDOM(data: FormData, container: HTMLFormElement): Answer;
  AnswerView: React.FC<{ answer: Answer }>;
  compareAnswers?(providedAnswer: Answer, userAnswer: Answer): boolean;
}
