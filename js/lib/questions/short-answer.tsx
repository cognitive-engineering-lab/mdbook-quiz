import React from "react";
import { QuestionMethods, QuestionFields, Markdown } from "./types";
import MarkdownView from "react-showdown";

export interface ShortAnswerPrompt {
  prompt: Markdown;
}

export interface ShortAnswerAnswer {
  answer: string;
}

export type ShortAnswer = QuestionFields<
  "ShortAnswer",
  ShortAnswerPrompt,
  ShortAnswerAnswer
>;

export let ShortAnswerMethods: QuestionMethods<
  ShortAnswerPrompt,
  ShortAnswerAnswer
> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  ResponseView: ({ submit, formValidators: { required } }) => (
    <>
      <input
        {...required("answer")}
        type="text"
        placeholder="Write your short answer here..."
        onKeyDown={(e) => {
          if (e.key == "Enter") submit();
        }}
      />
    </>
  ),

  AnswerView: ({ answer }) => <pre>{answer.answer}</pre>,
};
