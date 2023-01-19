import fs from "fs";
import * as tsSchema from "ts-json-schema-generator";
import { AliasType } from "ts-json-schema-generator";
import { DefinitionType } from "ts-json-schema-generator";
import { SchemaGenerator } from "ts-json-schema-generator";

// Ensures that "format": "markdown" is added to Markdown types
class MarkdownFormatter {
  supportsType(type) {
    return type.getName() == "Markdown";
  }

  getDefinition(_type) {
    return {
      type: "string",
      markdown: true
    };
  }

  getChildren() {
    return [];
  }
}

class QuestionFormatter {
  constructor(childTypeFormatter) {
    this.childTypeFormatter = childTypeFormatter;
  }

  supportsType(type) {
    return (
      type instanceof DefinitionType &&
      type.type instanceof AliasType &&
      type.type.type instanceof DefinitionType &&
      type.type.type.name.startsWith("QuestionFields")
    );
  }

  getDefinition(type) {
    return {
      $ref: `#/definitions/${type.type.type.name}`,
      questionType: type.name,
    };
  }

  getChildren(type) {
    return this.childTypeFormatter.getChildren(type.getType());
  }
}

function generateSchemas() {
  let config = {
    tsconfig: "tsconfig.json",
  };
  let formatter = tsSchema.createFormatter(
    config,
    (fmt, circularReferenceTypeFormatter) => {
      fmt.addTypeFormatter(new MarkdownFormatter());
      fmt.addTypeFormatter(
        new QuestionFormatter(circularReferenceTypeFormatter)
      );
    }
  );
  let program = tsSchema.createProgram(config);
  let parser = tsSchema.createParser(program, config);
  let generator = new SchemaGenerator(program, parser, formatter);
  let schema = generator.createSchema("Quiz");
  Object.keys(schema.definitions).forEach(k => {
    schema.definitions[k].$async = true;
  });
  schema.$async = true;

  return schema;
}

fs.writeFileSync(
  "dist/schema.js",
  `export const SCHEMA = ${JSON.stringify(generateSchemas())}`
);
fs.writeFileSync("dist/schema.d.ts", `export const SCHEMA: any;`);
