import React from "react";
import { QuestionViewBase } from "./base";
import { Snippet } from "../snippet";

export interface TracingQuestion {
  type: "Tracing";
  program: string;
}

export type TracingAnswer = {
  doesCompile: boolean;
  stdout?: string;
  lineNumber?: number;
};

export class TracingView extends QuestionViewBase<
  TracingQuestion,
  TracingAnswer
> {
  state: {
    doesCompile?: boolean;
  } = {};

  getAnswerFromDOM(container: HTMLDivElement) {
    let doesCompile = this.state.doesCompile!;
    if (doesCompile) {
      let stdout =
        container.querySelector<HTMLTextAreaElement>("textarea")!.value;
      return { doesCompile, stdout };
    } else {
      let lineNumber = parseInt(
        container.querySelector<HTMLInputElement>("input[type=number]")!.value
      );
      return { doesCompile, lineNumber };
    }
  }

  className() {
    return "tracing";
  }

  renderPrompt() {
    return (
      <>
        <p>
          Determine whether the program will pass the compiler. If it passes,
          say what will happen when it is executed. If it does not pass, say
          what kind of compiler error you will get.
        </p>
        <Snippet snippet={this.props.question.program} />
      </>
    );
  }

  renderResponse() {
    return (
      <>
        <div className="response-block">
          This program:{" "}
          <span className="option">
            <input
              type="radio"
              name="doesCompile"
              id="doesCompile1"
              onClick={() =>
                this.setState({ ...this.state, doesCompile: true })
              }
            />{" "}
            <label htmlFor="doesCompile1">does compile</label>
          </span>
          <span className="option-separator">OR</span>
          <span className="option">
            <input
              type="radio"
              name="doesCompile"
              id="doesCompile2"
              onClick={() =>
                this.setState({ ...this.state, doesCompile: false })
              }
            />{" "}
            <label htmlFor="doesCompile2">does not compile</label>
          </span>
        </div>

        {this.state.doesCompile !== undefined ? (
          this.state.doesCompile ? (
            <div>
              <p>The output of this program will be:</p>
              <textarea></textarea>
            </div>
          ) : (
            <div>
              <p>The error occurs on the line number:</p>
              <input type="number" min="1" />
            </div>
          )
        ) : null}
      </>
    );
  }
}
