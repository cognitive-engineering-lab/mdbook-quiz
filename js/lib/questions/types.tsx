import _ from "lodash";
import React from "react";
import { RegisterOptions, UseFormRegisterReturn, UseFormReturn } from "react-hook-form";

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
    prompt: Prompt;
    submit: () => void;
    formValidators: UseFormReturn & {
      required: (
        name: string,
        options?: RegisterOptions
      ) => UseFormRegisterReturn & { className: string };
    };
  }>;

  getAnswerFromDOM?(data: { [key: string]: any }, container: HTMLFormElement): Answer;

  AnswerView: React.FC<{ answer: Answer; baseline: Answer; prompt: Prompt }>;

  compareAnswers?(providedAnswer: Answer, userAnswer: Answer): boolean;

  validate?(prompt: Prompt, answer: Answer): boolean;
}
