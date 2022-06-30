import fs from "fs/promises";

import { Validator } from "../validate";

let main = async () => {
  let quizPath = process.argv[2];
  let validator = await Validator.load(__dirname);
  let contents = await fs.readFile(quizPath, "utf-8");
  let errors = await validator.validate(contents, quizPath);
  if (errors) {
    console.error(errors);
    process.exit(1);
  }
};

main();
