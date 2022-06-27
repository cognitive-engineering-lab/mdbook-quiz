import toml from "@iarna/toml";
import Ajv, { ValidateFunction } from "ajv";
import betterAjvErrors from "better-ajv-errors";
import fs from "fs/promises";
import _ from "lodash";
import path from "path";

export class Validator {
  constructor(readonly schema: any, readonly validator: ValidateFunction) {}

  static async load(distDir: string): Promise<Validator> {
    let ajv = new Ajv();
    ajv.addFormat("markdown", (_data: string) => {
      // TODO: how should we validate Markdown? Print it to the console for visual inspection?
      return true;
    });

    let schemaPath = path.join(distDir, "Quiz.schema.json");
    let schemaRaw = await fs.readFile(schemaPath, "utf-8");
    let schema = JSON.parse(schemaRaw);
    let validator = ajv.compile(schema);

    return new Validator(schema, validator);
  }

  validate(input: string): string | undefined {
    let quiz = toml.parse(input);
    if (!this.validator(quiz)) {
      return betterAjvErrors(this.schema, quiz, this.validator.errors!, {
        indent: 2,
      });
    }
  }
}
