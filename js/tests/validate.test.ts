import TOML from "@iarna/toml";

import { Quiz } from "../lib/components/quiz";
import { Validator } from "../lib/validate";

describe("validateQuiz", () => {
  let validator: Validator;
  beforeAll(async () => {
    validator = await Validator.load("dist");
  });

  let runInput = (quiz: any) => validator.validate(TOML.stringify(quiz), "quiz.toml");

  it("accepts a valid quiz", async () => {
    let quiz: Quiz = {
      questions: [
        {
          type: "ShortAnswer",
          prompt: { prompt: "Hey" },
          answer: { answer: "no" },
          context: "sup",
        },
      ],
    };

    expect(await runInput(quiz)).toBe(undefined);
  });

  it("rejects a quiz without questions", async () => {
    let quiz = { foo: "bar" };
    expect(await runInput(quiz)).not.toBe(undefined);
  });

  it("rejects a quiz with a bad question", async () => {
    let quiz = {
      questions: [
        {
          type: "ShortAnswer",
          prompt: { prompt: "Hey" },
        },
      ],
    };
    expect(await runInput(quiz)).not.toBe(undefined);
  });

  it("rejects a malformed TOML", async () => {
    let toml = '[[questions]]\ntype = "bar';
    expect(await validator.validate(toml, "quiz.toml")).not.toBe(undefined);
  });
});
