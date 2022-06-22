import React from "react";
import { QuestionViewBase } from "./base";
import MarkdownView from "react-showdown";

export interface ShortAnswerQuestion {
  type: "ShortAnswer";
  prompt: string;
}

export interface ShortAnswerAnswer {
  response: string;
}

export class ShortAnswerView extends QuestionViewBase<
  ShortAnswerQuestion,
  ShortAnswerAnswer
> {
  getAnswerFromDOM(container: HTMLDivElement) {
    let input = container.querySelector("input")! as HTMLInputElement;
    return { response: input.value };
  }

  className() {
    return "short-answer";
  }

  renderPrompt() {
    return <MarkdownView markdown={this.props.question.prompt} />;
  }

  renderResponse() {
    return <input type="text" />;
  }
}
