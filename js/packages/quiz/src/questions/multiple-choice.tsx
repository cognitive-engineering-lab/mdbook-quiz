import classNames from "classnames";
import _ from "lodash";
import React, { useId } from "react";

import type { Markdown } from "../bindings/Markdown";
import type { MultipleChoiceAnswer } from "../bindings/MultipleChoiceAnswer";
import type { MultipleChoicePrompt } from "../bindings/MultipleChoicePrompt";
import { MarkdownView } from "../components/markdown";
import type { QuestionMethods } from "./types";

interface MultipleChoiceState {
  choices: string[];
}

export let MultipleChoiceMethods: QuestionMethods<
  MultipleChoicePrompt,
  MultipleChoiceAnswer,
  MultipleChoiceState
> = {
  PromptView: ({ prompt }) => (
    <MarkdownView
      markdown={prompt.prompt}
      snippetOptions={{ lineNumbers: true }}
    />
  ),

  questionState(prompt, answer) {
    let choices: string[];
    let answers = Array.isArray(answer.answer)
      ? answer.answer
      : [answer.answer];
    if (prompt.answerIndex !== undefined) {
      choices = [...prompt.distractors];
      choices.splice(prompt.answerIndex, 0, ...answers);
    } else {
      choices = [...answers, ...prompt.distractors];
      if (prompt.sortAnswers) {
        choices = _.sortBy(choices);
      } else {
        choices = _.shuffle(choices);
      }
    }
    return { choices };
  },

  ResponseView: ({ answer, state, formValidators: { required, register } }) => (
    <>
      {state!.choices.map((choice, i) => {
        let id = useId();
        let multiAnswer = Array.isArray(answer.answer);
        return (
          <div className="choice" key={i}>
            <input
              type={multiAnswer ? "checkbox" : "radio"}
              {...(multiAnswer
                ? register("answer", {
                    validate: args => args.length > 0
                  })
                : required("answer"))}
              value={choice}
              id={id}
            />
            <label htmlFor={id}>
              <MarkdownView markdown={choice} />
            </label>
          </div>
        );
      })}
    </>
  ),

  getAnswerFromDOM(data) {
    if (Array.isArray(data.answer)) data.answer.sort();
    return { answer: data.answer };
  },

  compareAnswers(provided, user) {
    let toList = (s: Markdown | Markdown[]) =>
      _.sortBy(Array.isArray(s) ? s : [s]);
    return _.isEqual(toList(provided.answer), toList(user.answer));
  },

  AnswerView: ({ answer, baseline }) => (
    <div
      className={classNames(
        "md-flex",
        MultipleChoiceMethods.compareAnswers!(baseline, answer)
          ? "correct"
          : "incorrect"
      )}
    >
      {Array.isArray(answer.answer) ? (
        <ul>
          {answer.answer.map((a, i) => (
            <li key={i}>
              <MarkdownView markdown={a} />
            </li>
          ))}
        </ul>
      ) : (
        <MarkdownView markdown={answer.answer} />
      )}
    </div>
  )
};
