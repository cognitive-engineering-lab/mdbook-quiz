import classNames from "classnames";
import React from "react";

import { MarkdownView } from "../components/markdown";
import { Markdown, QuestionFields, QuestionMethods } from "./types";

export interface MultipleChoicePrompt {
  prompt: Markdown;
  choices: Markdown[];
}

export interface MultipleChoiceAnswer {
  answer: number;
}

export type MultipleChoice = QuestionFields<
  "MultipleChoice",
  MultipleChoicePrompt,
  MultipleChoiceAnswer
>;

export let MultipleChoiceMethods: QuestionMethods<MultipleChoicePrompt, MultipleChoiceAnswer> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  ResponseView: ({ prompt, formValidators: { required } }) => (
    <>
      {prompt.choices.map((choice, i) => {
        let id = `answer${i}`;
        return (
          <div className="md-flex" key={i}>
            <input type="radio" {...required("answer")} value={i} id={id} />
            <label htmlFor={id}>
              <MarkdownView markdown={choice} />
            </label>
          </div>
        );
      })}
    </>
  ),

  getAnswerFromDOM(data) {
    return { answer: parseInt(data.answer) };
  },

  AnswerView: ({ answer, baseline, prompt }) => (
    <div
      className={classNames("md-flex", answer.answer == baseline.answer ? "correct" : "incorrect")}
    >
      <MarkdownView markdown={prompt.choices[answer.answer]} />
    </div>
  ),
};
