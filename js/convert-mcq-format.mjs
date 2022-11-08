import toml from "@iarna/toml";
import TOMLParser from "@iarna/toml/lib/toml-parser.js";
import fs from "fs-extra";
import _ from "lodash";

let path = process.argv[2];
let contents = fs.readFileSync(path, "utf-8");

let re = /(prompt\.choices = .*)\nanswer\.answer = (\d+)/gs;
let newContents = contents.replace(re, (_m, choicesStr, answerStr) => {
  let parser = new TOMLParser();
  parser.parse(choicesStr);
  let {
    prompt: { choices },
  } = parser.finish();
  let answerIndex = parseInt(answerStr);
  let distractors = choices.filter((_a, i) => i != answerIndex);
  let answer = choices[answerIndex];

  let answerKey = `answer.` + toml.stringify({ answer }).trim();
  let distractorKey = `prompt.` + toml.stringify({ distractors }).trim();
  return answerKey + "\n" + distractorKey;
});

fs.writeFileSync(path, newContents);
