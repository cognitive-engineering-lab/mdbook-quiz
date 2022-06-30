import cp from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import util from "util";

import type { TracingAnswer, TracingPrompt } from "./tracing";
import { Validator } from "./validate";

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

export let validateTracing: Validator<TracingPrompt, TracingAnswer> = async (prompt, answer) => {
  let dir = await fs.mkdtemp(os.tmpdir());
  let inner = async () => {
    let inputPath = path.join(dir, "main.rs");
    await fs.writeFile(inputPath, prompt.program);

    try {
      await exec(`rustc ${inputPath} --error-format=json`, { cwd: dir });
      if (!answer.doesCompile) {
        return "Program should NOT compile, but DOES.";
      }

      let { stdout } = await exec("./main", { cwd: dir });
      stdout = stdout.trim();
      if (stdout != answer.stdout) {
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
    }
  };

  let result = await inner();
  await fs.rm(dir, { recursive: true });
  return result;
};
