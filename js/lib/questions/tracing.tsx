import React, { useState } from "react";
import { QuestionViews, Question } from "./base";
import { Snippet } from "../snippet";

export interface TracingPrompt {
  program: string;
}

export interface TracingAnswer {
  doesCompile: boolean;
  stdout?: string;
  lineNumber?: number;
}

export type Tracing = Question<"Tracing", TracingPrompt, TracingAnswer>;

export let TracingView: QuestionViews<TracingPrompt, TracingAnswer> = {
  getAnswerFromDOM(data: FormData) {
    let doesCompile = data.get("doesCompile")! === "true";
    if (doesCompile) {
      let stdout = data.get("stdout")!.toString();
      return { doesCompile, stdout };
    } else {
      let lineNumber = parseInt(data.get("lineNumber")!.toString());
      return { doesCompile, lineNumber };
    }
  },

  PromptView: ({ prompt }: { prompt: TracingPrompt }) => (
    <>
      <p>
        Determine whether the program will pass the compiler. If it passes, say
        what will happen when it is executed. If it does not pass, say what kind
        of compiler error you will get.
      </p>
      <Snippet snippet={prompt.program} />
    </>
  ),

  ResponseView: () => {
    let [doesCompile, setDoesCompile] = useState<boolean | undefined>(
      undefined
    );
    return (
      <>
        <div className="response-block">
          This program:{" "}
          <span className="option">
            <input
              type="radio"
              name="doesCompile"
              id="doesCompile1"
              value="true"
              onClick={() => setDoesCompile(true)}
            />{" "}
            <label htmlFor="doesCompile1">does compile</label>
          </span>
          <span className="option-separator">OR</span>
          <span className="option">
            <input
              type="radio"
              name="doesCompile"
              id="doesCompile2"
              value="false"
              onClick={() => setDoesCompile(false)}
            />{" "}
            <label htmlFor="doesCompile2">does not compile</label>
          </span>
        </div>

        {doesCompile !== undefined ? (
          doesCompile ? (
            <div>
              <p>The output of this program will be:</p>
              <textarea name="stdout"></textarea>
            </div>
          ) : (
            <div>
              <p>The error occurs on the line number:</p>
              <input name="lineNumber" type="number" min="1" />
            </div>
          )
        ) : null}
      </>
    );
  },

  AnswerView: ({ answer }: { answer: TracingAnswer }) => {
    return (
      <div>
        <p>
          This program{" "}
          <strong>{answer.doesCompile ? "does" : "does not"}</strong> compile.
        </p>
        <div>
          {answer.doesCompile ? (
            <>
              <p>The output of this program will be:</p>
              <pre>{answer.stdout}</pre>
            </>
          ) : (
            <>
              <p>The error occurs on the line number:</p>
              <pre>{answer.lineNumber}</pre>
            </>
          )}
        </div>
      </div>
    );
  },
};
