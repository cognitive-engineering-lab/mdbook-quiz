import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import type { MultipleChoice } from "../src/bindings/MultipleChoice";
import {
  MultipleChoiceMethods,
  QuestionView,
  QuizConfigContext
} from "../src/lib";
import { submitButton } from "./utils";

describe("MultipleChoice", () => {
  let question: MultipleChoice & { type: "MultipleChoice" } = {
    type: "MultipleChoice",
    prompt: { prompt: "Hello world", distractors: ["B", "C"] },
    answer: { answer: "A" }
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    let state = MultipleChoiceMethods.questionState!(
      question.prompt,
      question.answer
    );
    render(
      <QuizConfigContext.Provider value={{ name: "Foobar", quiz: {} as any }}>
        <QuestionView
          question={question}
          multipart={{}}
          title={"1"}
          index={1}
          attempt={0}
          questionState={state}
          onSubmit={answer => {
            submitted = answer;
          }}
        />
      </QuizConfigContext.Provider>
    );
    await waitFor(() => screen.getByText("Hello world"));
  });

  it("initially renders", () => {});

  it("validates input", async () => {
    await user.click(submitButton());
    expect(submitted).toBe(null);
  });

  it("accepts valid input", async () => {
    let input = screen.getByRole("radio", { name: "A" });
    await user.click(input);
    await user.click(submitButton());
    expect(submitted).toMatchObject({
      answer: { answer: "A" },
      correct: true
    });
  });
});

describe("MultipleChoice multi-answer", () => {
  let question: MultipleChoice & { type: "MultipleChoice" } = {
    type: "MultipleChoice",
    prompt: { prompt: "Hello world", distractors: ["C", "D"] },
    answer: { answer: ["A", "B"] }
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    let state = MultipleChoiceMethods.questionState!(
      question.prompt,
      question.answer
    );
    render(
      <QuizConfigContext.Provider value={{ name: "Foobar", quiz: {} as any }}>
        <QuestionView
          question={question}
          multipart={{}}
          index={1}
          title="1"
          attempt={0}
          questionState={state}
          onSubmit={answer => {
            submitted = answer;
          }}
        />
      </QuizConfigContext.Provider>
    );
    await waitFor(() => screen.getByText("Hello world"));
  });

  it("initially renders", () => {});

  it("validates input", async () => {
    await user.click(submitButton());
    expect(submitted).toBe(null);
  });

  it("accepts valid input", async () => {
    for (let name of ["A", "B"]) {
      let input = screen.getByRole("checkbox", { name });
      await user.click(input);
    }

    await user.click(submitButton());
    expect(submitted).toMatchObject({
      answer: { answer: ["A", "B"] },
      correct: true
    });
  });
});
