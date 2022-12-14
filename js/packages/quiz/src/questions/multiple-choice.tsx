import {
  Markdown,
  MultipleChoiceAnswer,
  MultipleChoicePrompt,
} from "@wcrichto/quiz-schema";
import classNames from "classnames";
import _ from "lodash";
import React from "react";

import { MarkdownView } from "../components/markdown";
import { QuestionMethods } from "./types";

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
    let answers =
      answer.answer instanceof Array ? answer.answer : [answer.answer];
    if (prompt.answerIndex) {
      choices = [...prompt.distractors];
      choices.splice(prompt.answerIndex, 0, ...answers);
    } else {
      choices = [...answers, ...prompt.distractors];
      choices = _.shuffle(choices);
    }
    return { choices };
  },

  ResponseView: ({ answer, state, formValidators: { required, register } }) => (
    <>
      {state!.choices.map((choice, i) => {
        let id = `answer${i}`;
        let multiAnswer = answer.answer instanceof Array;
        return (
          <div className="choice" key={i}>
            <input
              type={multiAnswer ? "checkbox" : "radio"}
              {...(multiAnswer
                ? register("answer", {
                    validate: args => args.length > 0,
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
    if (data.answer instanceof Array) data.answer.sort();
    return { answer: data.answer };
  },

  compareAnswers(provided, user) {
    let toList = (s: Markdown | Markdown[]) =>
      _.sortBy(s instanceof Array ? s : [s]);
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
      {answer.answer instanceof Array ? (
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
  ),
};
