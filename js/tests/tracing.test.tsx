/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { Tracing } from "../lib/questions/tracing";
import { QuestionView } from "../lib/questions/mod";

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
        question={question}
        onSubmit={(answer) => {
          submitted = answer;
        }}
      />
    );
    await waitFor(() => screen.getByText("Prompt"));
  });

  it("initially renders", () => {});

  let getCheckbox = () =>
    screen.getByRole("radio", {
      name: "does compile",
    });

  it("validates input", async () => {
    let submit = screen.getByRole("button");
    await user.click(submit);
    expect(submitted).toBe(null);

    let checkbox = getCheckbox();
    await user.click(checkbox);
    await user.click(submit);
    expect(submitted).toBe(null);
  });

  it("accepts valid input", async () => {
    let submit = screen.getByRole("button");
    let checkbox = getCheckbox();
    await user.click(checkbox);

    let input = screen.getByRole("textbox");
    await user.type(input, "foobar");
    await user.click(submit);

    expect(submitted).toStrictEqual({ doesCompile: true, stdout: "foobar" });
  });
});
