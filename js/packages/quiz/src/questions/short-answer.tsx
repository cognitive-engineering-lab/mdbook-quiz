import { ShortAnswerAnswer, ShortAnswerPrompt } from "@wcrichto/quiz-schema";
import React from "react";

import { MarkdownView } from "../components/markdown";
import { QuestionMethods } from "./types";

export let ShortAnswerMethods: QuestionMethods<
  ShortAnswerPrompt,
  ShortAnswerAnswer
> = {
  PromptView: ({ prompt }) => (
    <MarkdownView
      markdown={prompt.prompt}
      snippetOptions={{ lineNumbers: true }}
    />
  ),

  ResponseView: ({ prompt, submit, formValidators: { required } }) => {
    let formFields = required("answer");
    return (
      <>
        {!prompt.response || prompt.response == "short" ? (
          <input
            {...formFields}
            type="text"
            placeholder="Write your answer here..."
            onKeyDown={e => {
              if (e.key == "Enter") submit();
            }}
          />
        ) : (
          /* prompt.response == "long" */
          <textarea {...formFields} placeholder="Write your answer here..." />
        )}
      </>
    );
  },

  AnswerView: ({ answer, baseline }) => (
    <code
      className={
        ShortAnswerMethods.compareAnswers!(baseline, answer)
          ? "correct"
          : "incorrect"
      }
    >
      {answer.answer}
    </code>
  ),

  compareAnswers(
    providedAnswer: ShortAnswerAnswer,
    userAnswer: ShortAnswerAnswer
  ): boolean {
    let clean = (s: string) => s.toLowerCase().trim();
    let possibleAnswers = [providedAnswer.answer]
      .concat(providedAnswer.alternatives || [])
      .map(clean);
    return possibleAnswers.includes(clean(userAnswer.answer));
  },
};
