import TOML from "@iarna/toml";

import { Quiz } from "../lib/components/quiz";
import { Validator } from "../lib/validate";

describe("validateQuiz", () => {
  let validator: Validator;
  beforeAll(async () => {
    validator = await Validator.load("dist");
  });

  let runInput = (quiz: any) => validator.validate(TOML.stringify(quiz));

  it("accepts a valid quiz", () => {
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

    expect(runInput(quiz)).toBe(undefined);
  });

  it("rejects a quiz without questions", () => {
    let quiz = { foo: "bar" };
    expect(runInput(quiz)).not.toBe(undefined);
  });

  it("rejects a quiz with a bad question", () => {
    let quiz = {
      questions: [
        {
          type: "ShortAnswer",
          prompt: { prompt: "Hey" },
        },
      ],
    };
    expect(runInput(quiz)).not.toBe(undefined);
  });

  it("rejects a malformed TOML", async () => {
    let toml = '[[questions]]\ntype = "bar';
    expect(validator.validate(toml)).not.toBe(undefined);
  });
});
