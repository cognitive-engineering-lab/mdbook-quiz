import { Validator } from "../validate";

let main = () => {
  process.stdin.resume();
  process.stdin.setEncoding("ascii");

  let input = "";
  process.stdin.on("data", chunk => {
    input += chunk;
  });
  process.stdin.on("end", async () => {
    let validator = await Validator.load(__dirname);
    let errors = validator.validate(input);
    if (errors) {
      console.error(errors);
      process.exit(1);
    }
  });
};

main();
