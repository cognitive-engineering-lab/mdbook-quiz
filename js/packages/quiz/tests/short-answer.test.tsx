import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import { ShortAnswer } from "@wcrichto/quiz-schema";
import React from "react";

import { QuestionView } from "../dist/lib";
import { submitButton } from "./utils";

describe("ShortAnswer", () => {
  let question: ShortAnswer = {
    type: "ShortAnswer",
    prompt: { prompt: "Hello world" },
    answer: { answer: "Yes", alternatives: ["Ok"] },
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    render(
      <QuestionView
        quizName={"Foobar"}
        question={question}
        index={1}
        attempt={0}
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
    let input = screen.getByRole("textbox");
    await user.type(input, "yEs ");
    await user.click(submitButton());
    // answers should be case-insensitive and trim whitespace
    expect(submitted).toMatchObject({
      answer: { answer: "yEs " },
      correct: true,
    });
  });

  it("accepts alternatives", async () => {
    let input = screen.getByRole("textbox");
    await user.type(input, "Ok");
    await user.click(submitButton());
    expect(submitted).toMatchObject({
      answer: { answer: "Ok" },
      correct: true,
    });
  });
});
