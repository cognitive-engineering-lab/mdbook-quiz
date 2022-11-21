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

  /** If defined, don't randomize distractors and put answer at this index. */
  answerIndex?: number;
}

export interface MultipleChoiceAnswer {
  /** The text of the correct answer. */
  answer: Markdown;
}

export type MultipleChoice = QuestionFields<
  "MultipleChoice",
  MultipleChoicePrompt,
  MultipleChoiceAnswer
>;

interface MultipleChoiceState {
  choices: string[];
}

export let MultipleChoiceMethods: QuestionMethods<
  MultipleChoicePrompt,
  MultipleChoiceAnswer,
  MultipleChoiceState
> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  questionState(prompt, answer) {
    let choices: string[];
    if (prompt.answerIndex) {
      choices = [...prompt.distractors];
      choices.splice(prompt.answerIndex, 0, answer.answer);
    } else {
      choices = [answer.answer, ...prompt.distractors];
      choices = _.shuffle(choices);
    }
    return { choices };
  },

  ResponseView: ({ state, formValidators: { required } }) => (
    <>
      {state!.choices.map((choice, i) => {
        let id = `answer${i}`;
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
  ),

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
