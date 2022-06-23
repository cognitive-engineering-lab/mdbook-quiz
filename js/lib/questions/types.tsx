import React from "react";
import {
  RegisterOptions,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";

export type Markdown = string;

export interface QuestionFields<Type extends string, Prompt, Answer> {
  type: Type;
  prompt: Prompt;
  answer: Answer;
  context?: Markdown;
}

export interface QuestionMethods<Prompt, Answer> {
  PromptView: React.FC<{ prompt: Prompt }>;

  ResponseView: React.FC<{
    submit: () => void;
    formValidators: UseFormReturn & {
      required: (
        name: string,
        options?: RegisterOptions
      ) => UseFormRegisterReturn & { className: string };
    };
  }>;

  getAnswerFromDOM?(
    data: { [key: string]: any },
    container: HTMLFormElement
  ): Answer;

  AnswerView: React.FC<{ answer: Answer }>;

  compareAnswers?(providedAnswer: Answer, userAnswer: Answer): boolean;
}
