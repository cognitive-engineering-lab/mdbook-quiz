import { cli, copyPlugin } from "@nota-lang/esbuild-utils";
import { sassPlugin } from "esbuild-sass-plugin";
import fs from "fs-extra";
import _ from "lodash";
import { createRequire } from "module";
import path from "path";
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
      format: "markdown",
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
  let formatter = tsSchema.createFormatter(config, (fmt, circularReferenceTypeFormatter) => {
    fmt.addTypeFormatter(new MarkdownFormatter());
    fmt.addTypeFormatter(new QuestionFormatter(circularReferenceTypeFormatter));
  });
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

let peerfixPlugin = ({ modules, meta }) => ({
  name: "peerfix",
  setup(build) {
    let require = createRequire(meta.url);
    modules = modules.filter(m => !(build.initialOptions.external || []).includes(m));
    if (modules.length == 0) return;

    let filter = new RegExp(modules.map(k => `(^${_.escapeRegExp(k)}$)`).join("|"));
    build.onResolve({ filter }, args => {
      let resolved = require.resolve(args.path);
      return { path: resolved };
    });
  },
});

async function main() {
  let build = cli();
  let p1 = build({
    format: "iife",
    entryPoints: ["lib/entryPoints/embed.tsx"],
    sourcemap: true,
    plugins: [
      copyPlugin({ extensions: [".html"] }),
      sassPlugin(),
      peerfixPlugin({ modules: ["react"], meta: import.meta }),
      {
        name: "rust-editor",
        setup(build) {
          if (process.env.RUST_EDITOR === undefined) {
            build.onResolve({ filter: /@wcrichto\/rust-editor/ }, args => ({
              path: args.path,
              namespace: "rust-editor",
            }));
            build.onLoad({ filter: /.*/, namespace: "rust-editor" }, () => ({
              contents: "module.exports = {}",
            }));
            return;
          }

          build.onEnd(() => {
            let files = ["editor.worker.js", "ra-worker.js", "wasm_demo_bg.wasm"];
            files.forEach(f =>
              fs.copyFileSync(
                path.join("node_modules/@wcrichto/rust-editor/dist", f),
                path.join("dist", f)
              )
            );

            ["ra-worker"].forEach(name => {
              let assetPath = path.join("dist", `${name}.js`);
              let contents = fs.readFileSync(assetPath, "utf-8");
              contents = contents.replace(
                /import\.meta\.url/g,
                `"http://localhost:3000/mdbook-quiz/"`
              );
              fs.writeFileSync(assetPath, contents);
            });
          });
        },
      },
    ],
  });
  let p2 = build({
    format: "cjs",
    platform: "node",
    entryPoints: ["lib/entryPoints/validator.ts"],
    sourcemap: true,
    bundle: true,
    minify: false,
    define: {
      QUIZ_SCHEMA: JSON.stringify(generateSchemas()),
    },
    outExtension: { ".js": ".cjs" },
  });
  let p3 = build({
    format: "esm",
    entryPoints: ["lib/export.ts"],
  });
  let p4 = build({
    format: "cjs",
    platform: "node",
    entryPoints: ["lib/entryPoints/build-quiz.ts"],
    outExtension: { ".js": ".cjs" },
    external: ["@iarna/toml"],
    plugins: [sassPlugin()],
  });
  let p5 = build({
    format: "cjs",
    platform: "node",
    entryPoints: ["lib/entryPoints/gen-quiz-ids.ts"],
    outExtension: { ".js": ".cjs" },
    external: ["@iarna/toml"],
  });
  await Promise.all([p1, p2, p3, p4, p5]);
}

main();
