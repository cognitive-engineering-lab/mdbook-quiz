/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { QuizView, Quiz } from "../lib/components/quiz";

describe("Quiz", () => {
  let quiz: Quiz = {
    questions: [
      {
        type: "ShortAnswer",
        prompt: { prompt: "Hey" },
        answer: { answer: "Yes" },
      },
    ],
  };

  beforeEach(async () => {
    render(<QuizView name="the-quiz" quiz={quiz} />);
    await waitFor(() => screen.getByText("Quiz"));
  });

  it("initially renders", () => {});

  it("starts after click", async () => {
    await user.click(screen.getByRole("button"));
    await waitFor(() => screen.getByText("Question 1"));
  });

  it("shows you answers after completion", async () => {
    await user.click(screen.getByRole("button"));
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "No");
    await user.click(screen.getByRole("button"));
    await waitFor(() => screen.getByText("Answer Review"));
  });
});
