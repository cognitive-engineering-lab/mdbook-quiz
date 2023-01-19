import fs from "fs/promises";

import { Validator } from "./validate";

export { Validator } from "./validate";

let main = async () => {
  let quizPath = process.argv[2];
  let validator = await Validator.load();
  let contents = await fs.readFile(quizPath, "utf-8");
  let { errors, warnings } = await validator.validate(contents, quizPath);
  if (warnings) {
    console.warn(warnings);
  }
  if (errors) {
    console.error(errors);
    process.exit(1);
  }
};

if (typeof require !== "undefined" && require.main === module) {
  main();
}
