import React, { useState } from "react";
import { QuestionMethods, QuestionFields } from "./types";
import { Snippet } from "../components/snippet";
import classNames from "classnames";
import _ from "lodash";

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
    prompt,
    formValidators: {
      required,
      formState: { errors },
    },
  }) => {
    let [doesCompile, setDoesCompile] = useState<boolean | undefined>(
      undefined
    );
    let lineNumbers = _.range(prompt.program.trim().split("\n").length).map(
      (i) => i + 1
    );
    return (
      <>
        <div className="response-block">
          This program:{" "}
          <span className={classNames("option", { error: errors.doesCompile })}>
            <input
              type="radio"
              {...required("doesCompile")}
              id="doesCompileTrue"
              value="true"
              onClick={() => setDoesCompile(true)}
            />{" "}
            <label htmlFor="doesCompileTrue">DOES compile</label>
          </span>
          <span className="option-separator">OR</span>
          <span className={classNames("option", { error: errors.doesCompile })}>
            <input
              type="radio"
              {...required("doesCompile")}
              id="doesCompileFalse"
              value="false"
              onClick={() => setDoesCompile(false)}
            />{" "}
            <label htmlFor="doesCompileFalse">does NOT compile</label>
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
                <select {...required("lineNumber")}>
                  <option value="" disabled selected>
                    Select...
                  </option>
                  {lineNumbers.map((n, i) => (
                    <option key={i} value={n}>
                      Line {n}
                    </option>
                  ))}
                </select>
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

  AnswerView: ({ answer, baseline }) => {
    let correctnessClass = (key: keyof TracingAnswer) =>
      answer[key] == baseline[key] ? "correct" : "incorrect";
    return (
      <div>
        <p className={correctnessClass("doesCompile")}>
          This program{" "}
          <strong>{answer.doesCompile ? "does" : "does not"}</strong> compile.
        </p>
        {answer.doesCompile ? (
          <>
            <p className={correctnessClass("stdout")}>
              The output of this program will be:
            </p>
            <pre>{answer.stdout}</pre>
          </>
        ) : (
          <p className={correctnessClass("lineNumber")}>
            The error occurs on the line number:{" "}
            <code>{answer.lineNumber}</code>
          </p>
        )}
      </div>
    );
  },
};
