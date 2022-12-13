import _ from "lodash";
import React from "react";
import {
  RegisterOptions,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";

export interface QuestionMethods<Prompt, Answer, State = any> {
  PromptView: React.FC<{ prompt: Prompt }>;

  ResponseView: React.FC<{
    prompt: Prompt;
    answer: Answer;
    submit: () => void;
    state?: State;
    formValidators: UseFormReturn & {
      required: (
        name: string,
        options?: RegisterOptions
      ) => UseFormRegisterReturn & { className: string };
    };
  }>;

  questionState?(prompt: Prompt, answer: Answer): State;

  getAnswerFromDOM?(
    data: { [key: string]: any },
    container: HTMLFormElement
  ): Answer;

  AnswerView: React.FC<{ answer: Answer; baseline: Answer; prompt: Prompt }>;

  compareAnswers?(providedAnswer: Answer, userAnswer: Answer): boolean;

  validate?(prompt: Prompt, answer: Answer): boolean;
}
