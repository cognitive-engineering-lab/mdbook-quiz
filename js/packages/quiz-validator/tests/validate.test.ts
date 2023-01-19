import TOML from "@iarna/toml";
import { Quiz } from "@wcrichto/quiz-schema";

//@ts-ignore
import { Validator } from "../dist/main";

describe("validateQuiz", () => {
  let validator: any;
  beforeAll(async () => {
    validator = await Validator.load();
  });

  let runInput = (quiz: any) =>
    validator.validate(TOML.stringify(quiz), "quiz.toml");

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

    let result = await runInput(quiz);
    expect(result.errors).toBe(undefined);
  });

  it("rejects a quiz without questions", async () => {
    let quiz = { foo: "bar" };
    let result = await runInput(quiz);
    expect(result.errors).not.toBe(undefined);
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
    let result = await runInput(quiz);
    expect(result.errors).not.toBe(undefined);
  });

  it("rejects a malformed TOML", async () => {
    let toml = '[[questions]]\ntype = "bar';
    let result = await validator.validate(toml, "quiz.toml");
    expect(result.errors).not.toBe(undefined);
  });

  it("warns about spellchecking errors in markdown", async () => {
    let quiz = {
      questions: [
        {
          type: "ShortAnswer",
          prompt: { prompt: "A mispeling" },
          answer: { answer: "Yes" },
        },
      ],
    };
    let result = await runInput(quiz);
    expect(result.errors).toBe(undefined);
    expect(result.warnings).not.toBe(undefined);
  });
});
