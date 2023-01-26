import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import { ShortAnswer } from "@wcrichto/quiz-schema";
import React from "react";

import { QuestionView } from "../dist/lib";
import { submitButton } from "./utils";

describe("Question prompt for explanation", () => {
  let question: ShortAnswer = {
    type: "ShortAnswer",
    prompt: { prompt: "Hello world" },
    answer: { answer: "Yes" },
    promptExplanation: true,
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
