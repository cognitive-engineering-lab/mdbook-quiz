import { cli, copyPlugin } from "@nota-lang/esbuild-utils";
import { sassPlugin } from "esbuild-sass-plugin";
import * as tsSchema from "ts-json-schema-generator";
import { SchemaGenerator } from "ts-json-schema-generator";
import fs from "fs/promises";
import path from "path";
import { QUESTION_TYPES } from "./lib/question-types.mjs";

// Ensures that "format": "markdown" is added to Markdown types
class MarkdownFormatter {
  supportsType(type) {
    return type.getName() == "Markdown";
  }

  getDefinition(type) {
    return {
      type: "string",
      format: "markdown",
    };
  }

  getChildren() {
    return [];
  }
}

async function generateSchemas() {
  await fs.mkdir("dist", { recursive: true });

  let config = {
    tsconfig: "tsconfig.json",
  };
  let formatter = tsSchema.createFormatter(config, (fmt) =>
    fmt.addTypeFormatter(new MarkdownFormatter())
  );
  let program = tsSchema.createProgram(config);
  let parser = tsSchema.createParser(program, config);
  let generator = new SchemaGenerator(program, parser, formatter);

  let ps = QUESTION_TYPES.map(async (questionType) => {
    let schema = generator.createSchema(questionType);
    let outPath = path.join("dist", `${questionType}.schema.json`);
    await fs.writeFile(outPath, JSON.stringify(schema));
  });

  await Promise.all(ps);
}

async function main() {
  let build = cli();
  let p1 = build({
    format: "iife",
    bundle: true,
    entryPoints: ["lib/entryPoints/embed.tsx", "lib/entryPoints/consent.tsx"],
    plugins: [copyPlugin({ extensions: [".html"] }), sassPlugin()],
  });

  let p2 = build({
    format: "cjs",
    platform: "node",
    entryPoints: ["lib/entryPoints/validator.ts"],
  });

  let p3 = generateSchemas();

  await Promise.all([p1, p2, p3]);
}

main();
