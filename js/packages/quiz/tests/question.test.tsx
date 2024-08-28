import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import type { Question } from "../src/bindings/Question";
import { QuestionView, QuizConfigContext } from "../src/lib";
import { submitButton } from "./utils";

describe("Question prompt for explanation", () => {
  let question: Question = {
    type: "ShortAnswer",
    prompt: { prompt: "Hello world" },
    answer: { answer: "Yes" },
    promptExplanation: true
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

  it("accepts an explanation", async () => {
    let input = screen.getByRole("textbox");
    await user.type(input, "No");
    await user.click(submitButton());

    input = screen.getByTitle("Explanation");
    await user.type(input, "Because");
    await user.click(submitButton());

    expect(submitted.answer).toMatchObject({ explanation: "Because" });
  });
});
