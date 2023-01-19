import toml from "@iarna/toml";
import type { Question } from "@wcrichto/quiz-schema";
import { SCHEMA } from "@wcrichto/quiz-schema/dist/schema";
import Ajv, { AsyncSchema, AsyncValidateFunction } from "ajv";
import betterAjvErrors from "better-ajv-errors";
import _ from "lodash";
import remarkParse from "remark-parse";
//@ts-ignore
import spellchecker from "spellchecker";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { questionValidators } from "./validators";

export class Validator {
  constructor(
    readonly schema: any,
    readonly validator: AsyncValidateFunction<void>,
    private validatorWarnings: any[]
  ) {}

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

    // TODO: figure out how to let user specify custom words for spellchecker
    let sc = new spellchecker.Spellchecker();
    sc.setDictionary("en_US", spellchecker.getDictionaryPath());
    let validatorWarnings: any[] = [];
    ajv.addKeyword({
      keyword: "markdown",
      async: true,
      async validate(_true, data, _schema, ctxt) {
        let tree = unified().use(remarkParse).parse(data);
        visit(tree, node => {
          if (node.type != "text") return;

          let misspellings: { start: number; end: number }[] = sc.checkSpelling(
            node.value
          );
          if (misspellings.length > 0) {
            let bad = misspellings.map(
              ({ start, end }) => `"${node.value.slice(start, end)}"`
            );
            let message = `Misspelled: [${bad.join(", ")}] (full text: "${
              node.value
            }")`;
            validatorWarnings.push({
              keyword: "markdown",
              message,
              instancePath: ctxt?.instancePath,
            });
          }
        });
        return true;
      },
    });

    let validator = ajv.compile<void>(SCHEMA as AsyncSchema);

    return new Validator(SCHEMA, validator, validatorWarnings);
  }

  async validate(
    input: string,
    quizPath: string
  ): Promise<{ errors?: string; warnings?: string }> {
    let quiz: any;
    let errors: string | undefined;
    let fmt = (errors: any) =>
      betterAjvErrors(this.schema, quiz, errors, {
        indent: 2,
      });

    try {
      quiz = toml.parse(input);
      this.validatorWarnings.length = 0;
      await this.validator(quiz);
    } catch (err: any) {
      if (quiz && err instanceof Ajv.ValidationError) {
        let allErrors = err.errors.filter(
          err => !["const", "anyOf"].includes(err.keyword!)
        );
        errors = `Invalid quiz: ${quizPath}\n${fmt(allErrors)}`;
      } else {
        errors = err.toString();
      }
    }

    let warnings =
      this.validatorWarnings.length > 0
        ? `Misspellings in quiz: ${quizPath}\n${fmt(this.validatorWarnings)}`
        : undefined;

    return { errors, warnings };
  }
}
