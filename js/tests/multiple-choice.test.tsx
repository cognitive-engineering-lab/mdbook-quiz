/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";

import { QuestionView } from "../lib/questions/mod";
import { MultipleChoice } from "../lib/questions/multiple-choice";
import { submitButton } from "./utils";

describe("ShortAnswer", () => {
  let question: MultipleChoice = {
    type: "MultipleChoice",
    prompt: { prompt: "Hello world", choices: ["A", "B", "C"] },
    answer: { answer: 1 },
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    render(
      <QuestionView
        quizName={"Foobar"}
        question={question}
        index={1}
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
    let input = screen.getByRole("radio", { name: "B" });
    await user.click(input);
    await user.click(submitButton());
    expect(submitted).toMatchObject({
      answer: { answer: 1 },
      correct: true,
    });
  });
});
