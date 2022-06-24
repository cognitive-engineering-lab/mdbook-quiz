/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { ShortAnswer } from "../lib/questions/short-answer";
import { QuestionView } from "../lib/questions/mod";

describe("ShortAnswer", () => {
  let question: ShortAnswer = {
    type: "ShortAnswer",
    prompt: { prompt: "Hello world" },
    answer: { answer: "Yes" },
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
    let input = screen.getByRole("textbox");
    await user.type(input, "foobar");
    await user.click(submit);
    expect(submitted).toStrictEqual({ answer: "foobar" });
  });
});
