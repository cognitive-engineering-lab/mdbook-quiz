/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import user from "@testing-library/user-event";
import http from "http";
import "@testing-library/jest-dom";

import { QuizView, Quiz, QuizLog } from "../lib/components/quiz";

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

test("Quiz logs to the endpoint", async () => {
  let resolve: (value: any) => void;
  let completed = new Promise((inner) => {
    resolve = inner;
  });
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      let log: QuizLog = JSON.parse(data);
      expect(log.name).toBe("the-quiz");
      expect(log.answers).toStrictEqual([{ answer: "No", correct: false }]);

      res.writeHead(200);
      res.end();
      resolve(undefined);
    });
  });
  server.listen(8080);
  let logEndpoint = "http://localhost:8080";

  render(<QuizView name="the-quiz" quiz={quiz} logEndpoint={logEndpoint} />);
  await waitFor(() => screen.getByText("Quiz"));

  await user.click(screen.getByRole("button"));
  let input = await waitFor(() => screen.getByRole("textbox"));
  await user.type(input, "No");
  await user.click(screen.getByRole("button"));

  await completed;
  server.close();
});
