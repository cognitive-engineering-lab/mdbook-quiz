import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import type { ShortAnswer } from "../src/bindings/ShortAnswer";
import { QuestionView, QuizConfigContext } from "../src/lib";
import { submitButton } from "./utils";

describe("ShortAnswer", () => {
  let question: ShortAnswer & { type: "ShortAnswer" } = {
    type: "ShortAnswer",
    prompt: { prompt: "Hello world" },
    answer: { answer: "Yes", alternatives: ["Ok"] }
  };

  let submitted: any | null = null;
  beforeEach(async () => {
    submitted = null;
    render(
      <QuizConfigContext.Provider value={{ name: "Foobar", quiz: {} as any }}>
        <QuestionView
          question={question}
          multipart={{}}
          index={1}
          title="1"
          attempt={0}
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
    let input = screen.getByRole("textbox");
    await user.type(input, "yEs ");
    await user.click(submitButton());
    // answers should be case-insensitive and trim whitespace
    expect(submitted).toMatchObject({
      answer: { answer: "yEs " },
      correct: true
    });
  });

  it("accepts alternatives", async () => {
    let input = screen.getByRole("textbox");
    await user.type(input, "Ok");
    await user.click(submitButton());
    expect(submitted).toMatchObject({
      answer: { answer: "Ok" },
      correct: true
    });
  });
});
