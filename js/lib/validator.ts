import toml from "@iarna/toml";
import Ajv from "ajv";
import _ from "lodash";
import path from "path";
import fs from "fs/promises";
import betterAjvErrors from "better-ajv-errors";

import type { Quiz } from "./mdbook-quiz";

declare global {
  var QUESTION_TYPES: string[];
}

let main = () => {
  process.stdin.resume();
  process.stdin.setEncoding("ascii");

  let input = "";
  process.stdin.on("data", (chunk) => {
    input += chunk;
  });
  process.stdin.on("end", () => {
    validateQuiz(input);
  });
};

let validateQuiz = async (input: string) => {
  let ajv = new Ajv();
  ajv.addFormat("markdown", (_data: string) => {
    // TODO: how should we validate Markdown? Print it to the console for visual inspection?
    return true;
  });

  let schemaPromises = await Promise.all(
    QUESTION_TYPES.map(async (type) => {
      let schemaPath = path.join(__dirname, `${type}.schema.json`);
      let schemaRaw = await fs.readFile(schemaPath, "utf-8");
      let schema = JSON.parse(schemaRaw);
      let validator = ajv.compile(schema);
      return { schema, validator };
    })
  );
  let schemas = _.fromPairs(_.zip(QUESTION_TYPES, schemaPromises));

  let quiz = toml.parse(input) as unknown as Quiz;
  let anyErrors = false;
  quiz.questions.forEach((question, i) => {
    let { schema, validator } = schemas[question.type];
    if (!validator(question)) {
      anyErrors = true;
      console.error(`Validation error in question ${i}`);
      console.error(betterAjvErrors(schema, question, validator.errors));
    }
  });

  if (anyErrors) {
    process.exit(1);
  }
};

main();
