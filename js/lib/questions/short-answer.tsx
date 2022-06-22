import React from "react";
import { QuestionViews, Question } from "./base";
import MarkdownView from "react-showdown";

export interface ShortAnswerPrompt {
  prompt: string;
}

export interface ShortAnswerAnswer {
  answer: string;
}

export type ShortAnswer = Question<
  "ShortAnswer",
  ShortAnswerPrompt,
  ShortAnswerAnswer
>;

export let ShortAnswerView: QuestionViews<
  ShortAnswerPrompt,
  ShortAnswerAnswer
> = {
  PromptView: ({ prompt }: { prompt: ShortAnswerPrompt }) => (
    <MarkdownView markdown={prompt.prompt} />
  ),

  ResponseView: () => <input name="response" type="text" />,

  getAnswerFromDOM(data: FormData) {
    return { answer: data.get("response")!.toString() };
  },

  AnswerView: ({ answer }: { answer: ShortAnswerAnswer }) => (
    <MarkdownView markdown={answer.answer} />
  ),
};
