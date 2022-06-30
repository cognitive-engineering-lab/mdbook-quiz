import toml from "@iarna/toml";
import Ajv, { AsyncSchema, AsyncValidateFunction } from "ajv";
import betterAjvErrors from "better-ajv-errors";
import fs from "fs/promises";
import _ from "lodash";
import path from "path";

import type { Question } from "./questions/mod";
import { questionValidators } from "./questions/validate";

export class Validator {
  constructor(readonly schema: any, readonly validator: AsyncValidateFunction<void>) {}

  static async load(distDir: string): Promise<Validator> {
    let ajv = new Ajv();

    ajv.addKeyword({
      keyword: "questionType",
      async: true,
      async validate(questionType: Question["type"], question: Question) {
        if (process.env.QUIZ_LIGHTWEIGHT_VALIDATE !== undefined) {
          return true;
        }

        let validator = questionValidators[questionType];
        if (validator) {
          let message = await validator(question.prompt, question.answer);
          if (message) {
            throw new Ajv.ValidationError([
              {
                keyword: "questionType",
                message,
              },
            ]);
          }
        }
        return true;
      },
    });

    ajv.addFormat("markdown", (_data: string) => {
      // TODO: how should we validate Markdown? Print it to the console for visual inspection?
      return true;
    });

    let schemaPath = path.join(distDir, "Quiz.schema.json");
    let schemaRaw = await fs.readFile(schemaPath, "utf-8");
    let schema: AsyncSchema = JSON.parse(schemaRaw);
    let validator = ajv.compile<void>(schema);

    return new Validator(schema, validator);
  }

  async validate(input: string, quizPath: string): Promise<string | undefined> {
    let quiz;
    try {
      quiz = toml.parse(input);
      await this.validator(quiz);
    } catch (err: any) {
      if (quiz && err instanceof Ajv.ValidationError) {
        let formattedErrors = betterAjvErrors(
          this.schema,
          quiz,
          err.errors.filter(err => !["const", "anyOf"].includes(err.keyword!)) as any,
          {
            indent: 2,
          }
        );
        return `Invalid quiz: ${quizPath}\n${formattedErrors}`;
      } else {
        return err.toString();
      }
    }
  }
}
