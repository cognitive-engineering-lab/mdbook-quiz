/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import user from "@testing-library/user-event";
import http from "http";
import React from "react";

import { Quiz, QuizView } from "../lib/components/quiz";
import { AnswersLog, BugLog } from "../lib/logging";
import { bugButton, startButton, submitButton } from "./utils";

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

const PORT = 8080;
const ENDPOINT = `http://localhost:${PORT}`;

let withServer = (f: (req: http.IncomingMessage, json: any) => void): Promise<void> => {
  let resolve: (value: any) => void;
  let completed: Promise<void> = new Promise(inner => {
    resolve = inner;
  });
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", async () => {
      let json = JSON.parse(data);
      f(req, json);

      res.writeHead(200);
      res.end();

      server.close();

      resolve(undefined);
    });
  });
  server.listen(PORT);

  return completed;
};

describe("Quiz logger", () => {
  it("logs answers", async () => {
    let completed = withServer((req, log: AnswersLog) => {
      expect(req.method).toBe("POST");
      expect(req.url).toBe("/answers");

      expect(log.quizName).toBe("the-quiz");
      expect(log.answers).toStrictEqual([{ answer: "No", correct: false }]);
      expect(log.host).toBe("localhost");
    });

    render(<QuizView name="the-quiz" quiz={quiz} logEndpoint={ENDPOINT} />);
    await waitFor(() => screen.getByText("Quiz"));

    await user.click(startButton());
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.type(input, "No");
    await user.click(submitButton());

    await completed;
  });

  it("logs bugs", async () => {
    let completed = withServer((req, log: BugLog) => {
      expect(req.method).toBe("POST");
      expect(req.url).toBe("/bug");

      expect(log.quizName).toBe("the-quiz");
      expect(log.feedback).toBe("no");
      expect(log.host).toBe("localhost");
    });

    render(<QuizView name="the-quiz" quiz={quiz} logEndpoint={ENDPOINT} />);
    await waitFor(() => screen.getByText("Quiz"));

    await user.click(startButton());
    let input = await waitFor(() => screen.getByRole("textbox"));
    await user.click(bugButton());

    let feedback = screen.getByRole("textbox", { name: "Bug feedback" });
    await user.type(feedback, "no");
    await user.click(screen.getByRole("button", { name: "Submit bug feedback" }));

    await completed;
  });
});
