import React, { useState } from "react";
import { QuestionMethods, QuestionFields } from "./types";
import { Snippet } from "../components/snippet";
import classNames from "classnames";

export interface TracingPrompt {
  program: string;
}

export interface TracingAnswer {
  doesCompile: boolean;
  stdout?: string;
  lineNumber?: number;
}

export type Tracing = QuestionFields<"Tracing", TracingPrompt, TracingAnswer>;

export let TracingMethods: QuestionMethods<TracingPrompt, TracingAnswer> = {
  PromptView: ({ prompt }) => (
    <>
      <p>
        Determine whether the program will pass the compiler. If it passes, say
        what will happen when it is executed. If it does not pass, say what kind
        of compiler error you will get.
      </p>
      <Snippet snippet={prompt.program} />
    </>
  ),

  ResponseView: ({
    formValidators: {
      required,
      formState: { errors },
    },
  }) => {
    let [doesCompile, setDoesCompile] = useState<boolean | undefined>(
      undefined
    );
    return (
      <>
        <div className="response-block">
          This program:{" "}
          <span className={classNames("option", { error: errors.doesCompile })}>
            <input
              type="radio"
              {...required("doesCompile")}
              id="doesCompile1"
              value="true"
              onClick={() => setDoesCompile(true)}
            />{" "}
            <label htmlFor="doesCompile1">does compile</label>
          </span>
          <span className="option-separator">OR</span>
          <span className={classNames("option", { error: errors.doesCompile })}>
            <input
              type="radio"
              {...required("doesCompile")}
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
              <textarea
                {...required("stdout")}
                placeholder="Write the program's stdout here..."
              ></textarea>
            </div>
          ) : (
            <div>
              <p>
                The error occurs on the line number:{" "}
                <input
                  {...required("lineNumber")}
                  placeholder="Write the line number here..."
                  type="number"
                  min="1"
                />
              </p>
            </div>
          )
        ) : null}
      </>
    );
  },

  getAnswerFromDOM(data) {
    let doesCompile = data.doesCompile === "true";
    if (doesCompile) {
      let stdout = data.stdout;
      return { doesCompile, stdout };
    } else {
      let lineNumber = parseInt(data.lineNumber);
      return { doesCompile, lineNumber };
    }
  },

  AnswerView: ({ answer }) => {
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
              <p>
                The error occurs on the line number:{" "}
                <code>{answer.lineNumber}</code>
              </p>
            </>
          )}
        </div>
      </div>
    );
  },
};
