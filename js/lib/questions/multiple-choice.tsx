import classNames from "classnames";
import _ from "lodash";
import React from "react";

import { MarkdownView } from "../components/markdown";
import { Markdown, QuestionFields, QuestionMethods } from "./types";

export interface MultipleChoicePrompt {
  /** The text of the prompt. */
  prompt: Markdown;

  /** An array of incorrect answers. */
  distractors: Markdown[];
}

export interface MultipleChoiceAnswer {
  /** The correct answer. */
  answer: Markdown;
}

export type MultipleChoice = QuestionFields<
  "MultipleChoice",
  MultipleChoicePrompt,
  MultipleChoiceAnswer
>;

export let MultipleChoiceMethods: QuestionMethods<MultipleChoicePrompt, MultipleChoiceAnswer> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  ResponseView: ({ prompt, answer, formValidators: { required } }) => {
    let choices = [answer.answer, ...prompt.distractors];
    let order = _.range(choices.length);
    _.shuffle(order);
    return (
      <>
        {order.map(i => {
          let id = `answer${i}`;
          let choice = choices[i];
          return (
            <div className="choice" key={i}>
              <input type="radio" {...required("answer")} value={choice} id={id} />
              <label htmlFor={id}>
                <MarkdownView markdown={choice} />
              </label>
            </div>
          );
        })}
      </>
    );
  },

  getAnswerFromDOM(data) {
    return { answer: data.answer };
  },

  AnswerView: ({ answer, baseline }) => (
    <div
      className={classNames("md-flex", answer.answer == baseline.answer ? "correct" : "incorrect")}
    >
      <MarkdownView markdown={answer.answer} />
    </div>
  ),
};
