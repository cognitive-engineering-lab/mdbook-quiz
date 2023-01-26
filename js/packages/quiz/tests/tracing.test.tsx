import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import { Tracing } from "@wcrichto/quiz-schema";
import React from "react";

import { QuestionView } from "../dist/lib";
import { submitButton } from "./utils";

describe("Tracing", () => {
  let question: Tracing = {
    type: "Tracing",
    prompt: { program: "fn main(){}" },
    answer: { doesCompile: true, stdout: "Yes" },
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
    await waitFor(() => screen.getByText("Question 1"));
  });

  it("initially renders", () => {});

  let getCheckbox = () =>
    screen.getByRole("radio", {
      name: "DOES compile",
    });

  it("validates input", async () => {
    await user.click(submitButton());
    expect(submitted).toBe(null);

    let checkbox = getCheckbox();
    await user.click(checkbox);
    await user.click(submitButton());
    expect(submitted).toBe(null);
  });

  it("accepts valid input", async () => {
    let checkbox = getCheckbox();
    await user.click(checkbox);

    let input = screen.getByRole("textbox");
    await user.type(input, "Yes ");
    await user.click(submitButton());

    expect(submitted).toMatchObject({
      answer: { doesCompile: true, stdout: "Yes " },
      correct: true,
    });
  });

  it("rejects fully invalid input", async () => {
    let checkbox = screen.getByRole("radio", {
      name: "does NOT compile",
    });

    await user.click(checkbox);

    // let input = screen.getByRole("combobox");
    // await user.selectOptions(input, "1");
    await user.click(submitButton());

    expect(submitted).toMatchObject({
      answer: { doesCompile: false /* lineNumber: 1 */ },
      correct: false,
    });
  });

  it("rejects partially invalid input", async () => {
    let checkbox = getCheckbox();
    await user.click(checkbox);

    let input = screen.getByRole("textbox");
    await user.type(input, "No");
    await user.click(submitButton());

    expect(submitted).toMatchObject({
      answer: { doesCompile: true, stdout: "No" },
      correct: false,
    });
  });
});
