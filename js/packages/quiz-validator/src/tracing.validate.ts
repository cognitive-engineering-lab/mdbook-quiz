import type { TracingAnswer, TracingPrompt } from "@wcrichto/quiz-schema";
import cp from "child_process";
import fs from "fs/promises";
import _ from "lodash";
import os from "os";
import path from "path";
import util from "util";

import { Validator } from "./validators";

const exec = util.promisify(cp.exec);

interface RustcSpan {
  line_start: number;
  line_end: number;
}

interface RustcError {
  message: string;
  spans: RustcSpan[];
}

let indentString = (s: string, indent: number): string => {
  let re = /^(?!\s*$)/gm;
  return s.replace(re, " ".repeat(indent));
};

export let validateTracing: Validator<TracingPrompt, TracingAnswer> = async (
  prompt,
  answer
) => {
  let dir = await fs.mkdtemp(path.join(os.tmpdir(), "mdbook-quiz-"));
  let inner = async () => {
    if (!prompt.program) return "Missing program keyword";
    let inputPath = path.join(dir, "main.rs");
    await fs.writeFile(inputPath, prompt.program);

    try {
      await exec(`rustc ${inputPath} -A warnings --error-format=json`, {
        cwd: dir,
      });
      if (!answer.doesCompile) {
        return "Program should NOT compile, but DOES.";
      }

      let { stdout } = await exec("./main", { cwd: dir });
      stdout = stdout.trim();
      if (!answer.stdout || stdout != answer.stdout!.trim()) {
        let message = `
Actual stdout is not expected stdout. Actual:
${indentString(stdout, 2)}
Expected:
${indentString(answer.stdout!, 2)}
`.trim();
        return message;
      }
    } catch (e: any) {
      let errors: RustcError[] = e.stderr.trim().split("\n").map(JSON.parse);
      if (answer.doesCompile) {
        let message = [
          "Program SHOULD compile, but does NOT. Errors are:",
          ...errors.map(error => indentString(error.message, 2)),
        ].join("\n");
        return message;
      }

      /*let anyErrorHasLine = _.some(errors, error =>
        _.some(error.spans, span => span.line_start == answer.lineNumber)
      );
      if (!anyErrorHasLine) {
        let message = [
          `Provided lineNumber is ${answer.lineNumber}, but no error had that line number. Errors are:`,
          ...errors.map(error =>
            indentString(
              error.message +
                ` [${error.spans
                  .map(span => `${span.line_start}-${span.line_end}`)
                  .join(", ")}]`,
              2
            )
          ),
        ].join("\n");
        return message;
      }*/
    }
  };

  let result = await inner();
  await fs.rm(dir, { recursive: true });
  return result;
};
