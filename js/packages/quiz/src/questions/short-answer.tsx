import React from "react";

import type { ShortAnswerAnswer } from "../bindings/ShortAnswerAnswer";
import type { ShortAnswerPrompt } from "../bindings/ShortAnswerPrompt";
import { MarkdownView } from "../components/markdown";
import type { QuestionMethods } from "./types";

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
        {!prompt.response || prompt.response === "short" ? (
          <input
            {...formFields}
            type="text"
            placeholder="Ovdje napišite svoj odgovor..."
            onKeyDown={e => {
              if (e.key === "Enter") submit();
            }}
          />
        ) : (
          /* prompt.response == "long" */
          <textarea {...formFields} placeholder="Ovdje napišite svoj odgovor..." />
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
  }
};
