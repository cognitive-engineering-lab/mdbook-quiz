import React from "react";

import { MarkdownView } from "../components/markdown";
import { Markdown, QuestionFields, QuestionMethods } from "./types";

export interface ShortAnswerPrompt {
  /** The text of the prompt. */
  prompt: Markdown;
}

export interface ShortAnswerAnswer {
  /** The exact string that answers the question. */
  answer: string;
}

export type ShortAnswer = QuestionFields<"ShortAnswer", ShortAnswerPrompt, ShortAnswerAnswer>;

export let ShortAnswerMethods: QuestionMethods<ShortAnswerPrompt, ShortAnswerAnswer> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  ResponseView: ({ submit, formValidators: { required } }) => (
    <>
      <input
        {...required("answer")}
        type="text"
        placeholder="Write your short answer here..."
        onKeyDown={e => {
          if (e.key == "Enter") submit();
        }}
      />
    </>
  ),

  AnswerView: ({ answer, baseline }) => (
    <code
      className={ShortAnswerMethods.compareAnswers!(answer, baseline) ? "correct" : "incorrect"}
    >
      {answer.answer}
    </code>
  ),

  compareAnswers(providedAnswer: ShortAnswerAnswer, userAnswer: ShortAnswerAnswer): boolean {
    return providedAnswer.answer.toLowerCase() == userAnswer.answer.toLowerCase();
  },
};
