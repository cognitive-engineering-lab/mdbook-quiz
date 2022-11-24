import toml from "@iarna/toml";
import Ajv, { AsyncSchema, AsyncValidateFunction } from "ajv";
import betterAjvErrors from "better-ajv-errors";
import _ from "lodash";

import type { Question } from "./questions/mod";
import { questionValidators } from "./questions/validate";

declare global {
  var QUIZ_SCHEMA: AsyncSchema;
}

export class Validator {
  constructor(readonly schema: any, readonly validator: AsyncValidateFunction<void>) {}

  static async load(): Promise<Validator> {
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

    let validator = ajv.compile<void>(QUIZ_SCHEMA);

    return new Validator(QUIZ_SCHEMA, validator);
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
