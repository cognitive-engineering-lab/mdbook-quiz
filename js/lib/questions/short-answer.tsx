import { rust } from "@codemirror/lang-rust";
import CodeMirror from "@uiw/react-codemirror";
import React from "react";

import { MarkdownView } from "../components/markdown";
import { Markdown, QuestionFields, QuestionMethods } from "./types";

export interface ShortAnswerPrompt {
  /** The text of the prompt. */
  prompt: Markdown;

  /** Format of the response. */
  response?: "short" | "long" | "code";
}

export interface ShortAnswerAnswer {
  /** The exact string that answers the question. */
  answer: string;

  /** Other acceptable strings answers. */
  alternatives?: string[];
}

export type ShortAnswer = QuestionFields<"ShortAnswer", ShortAnswerPrompt, ShortAnswerAnswer>;

export let ShortAnswerMethods: QuestionMethods<ShortAnswerPrompt, ShortAnswerAnswer> = {
  PromptView: ({ prompt }) => <MarkdownView markdown={prompt.prompt} />,

  ResponseView: ({ prompt, submit, formValidators: { required, setValue } }) => {
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
        ) : prompt.response == "long" ? (
          <textarea {...formFields} placeholder="Write your answer here..." />
        ) : (
          <CodeMirror
            extensions={[rust()]}
            height={"10em"}
            indentWithTab={true}
            theme={document.documentElement.classList.contains("light") ? "light" : "dark"}
            placeholder={"Write your answer here..."}
            onChange={v => setValue("answer", v)}
          />
        )}
      </>
    );
  },

  AnswerView: ({ answer, baseline }) => (
    <code
      className={ShortAnswerMethods.compareAnswers!(answer, baseline) ? "correct" : "incorrect"}
    >
      {answer.answer}
    </code>
  ),

  compareAnswers(providedAnswer: ShortAnswerAnswer, userAnswer: ShortAnswerAnswer): boolean {
    let clean = (s: string) => s.toLowerCase().trim();
    let possibleAnswers = [providedAnswer.answer]
      .concat(providedAnswer.alternatives || [])
      .map(clean);
    return possibleAnswers.includes(clean(userAnswer.answer));
  },
};
