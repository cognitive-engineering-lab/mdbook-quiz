import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import { Quiz } from "@wcrichto/quiz-schema";
import React from "react";

import { QuizView } from "../dist/lib";
import { startButton, submitButton } from "./utils";

let quiz: Quiz = {
  questions: [
    {
      type: "ShortAnswer",
      prompt: { prompt: "Hey" },
      answer: { answer: "Yes" },
    },
  ],
};

describe("Quiz", () => {
  beforeEach(async () => {
    render(<QuizView name="the-quiz" quiz={quiz} />);
    await waitFor(() => screen.getByText("Quiz"));
  });

  it("initially renders", () => {});

  it("starts after click", async () => {
    await user.click(startButton());
    await waitFor(() => screen.getByText("Question 1"));
  });

  it("shows you answers after completion", async () => {
    await user.click(startButton());
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "No");
    await user.click(submitButton());
    await waitFor(() => screen.getByText("Answer Review"));
  });
});

describe("Quiz configuration", () => {
  it("can cache answers", async () => {
    let { rerender } = render(
      <QuizView key={0} name="the-quiz" quiz={quiz} cacheAnswers={true} />
    );
    await waitFor(() => screen.getByText("Quiz"));
    await user.click(startButton());
    await waitFor(() => screen.getByText("Question 1"));
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "No");
    await user.click(submitButton());
    await waitFor(() => screen.getByText("Answer Review"));

    // After rerendering the component, we should still be at the Answer Review
    rerender(
      <QuizView key={1} name="the-quiz" quiz={quiz} cacheAnswers={true} />
    );
    await waitFor(() => screen.getByText("Answer Review"));

    // But if the quiz changes, then the answers should be invalidated
    let newQuiz = { questions: [...quiz.questions, ...quiz.questions] };
    rerender(
      <QuizView key={2} name="the-quiz" quiz={newQuiz} cacheAnswers={true} />
    );
    await waitFor(() => startButton());
  });
});

describe("Quiz retry", () => {
  let longQuiz: Quiz = {
    questions: [
      {
        type: "ShortAnswer",
        prompt: { prompt: "Hey" },
        answer: { answer: "Yes" },
      },
      {
        type: "ShortAnswer",
        prompt: { prompt: "Hello" },
        answer: { answer: "No" },
      },
    ],
  };

  beforeEach(async () => {
    render(<QuizView name="the-quiz" quiz={longQuiz} allowRetry />);
    await waitFor(() => screen.getByText("Quiz"));
    await user.click(startButton());
    await waitFor(() => screen.getByText("Question 1"));

    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "Yes");
    await user.click(submitButton());

    input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "Yes");
    await user.click(submitButton());
  });

  it("allow for retrying after an incorrect answer", async () => {
    let retryButton = screen.getByRole("button", { name: "retry the quiz" });
    await user.click(retryButton);

    // Skips first question, only shows question 2
    await waitFor(() => screen.getByText("Question 2"));

    // Provide a correct answer...
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "No");
    await user.click(submitButton());

    // ...and button should disappear.
    expect(() =>
      screen.getByRole("button", { name: "retry the quiz" })
    ).toThrow();
  });
});
