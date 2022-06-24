/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { MultipleChoice } from "../lib/questions/multiple-choice";
import { QuestionView } from "../lib/questions/mod";

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
        question={question}
        index={1}
        onSubmit={(answer) => {
          submitted = answer;
        }}
      />
    );
    await waitFor(() => screen.getByText("Hello world"));
  });

  it("initially renders", () => {});

  it("validates input", async () => {
    let submit = screen.getByRole("button");
    await user.click(submit);
    expect(submitted).toBe(null);
  });

  it("accepts valid input", async () => {
    let submit = screen.getByRole("button");
    let input = screen.getByRole("radio", { name: "B" });
    await user.click(input);
    await user.click(submit);
    expect(submitted).toStrictEqual({ answer: 1 });
  });
});
