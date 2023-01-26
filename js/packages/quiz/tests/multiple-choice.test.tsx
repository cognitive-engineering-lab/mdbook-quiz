import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import { MultipleChoice } from "@wcrichto/quiz-schema";
import React from "react";

import { MultipleChoiceMethods, QuestionView } from "../dist/lib";
import { submitButton } from "./utils";

describe("MultipleChoice", () => {
  let question: MultipleChoice = {
    type: "MultipleChoice",
    prompt: { prompt: "Hello world", distractors: ["B", "C"] },
    answer: { answer: "A" },
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    let state = MultipleChoiceMethods.questionState!(
      question.prompt,
      question.answer
    );
    render(
      <QuestionView
        quizName={"Foobar"}
        question={question}
        index={1}
        attempt={0}
        questionState={state}
        onSubmit={answer => {
          submitted = answer;
        }}
      />
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
      correct: true,
    });
  });
});

describe("MultipleChoice multi-answer", () => {
  let question: MultipleChoice = {
    type: "MultipleChoice",
    prompt: { prompt: "Hello world", distractors: ["C", "D"] },
    answer: { answer: ["A", "B"] },
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    let state = MultipleChoiceMethods.questionState!(
      question.prompt,
      question.answer
    );
    render(
      <QuestionView
        quizName={"Foobar"}
        question={question}
        index={1}
        attempt={0}
        questionState={state}
        onSubmit={answer => {
          submitted = answer;
        }}
      />
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
      correct: true,
    });
  });
});
