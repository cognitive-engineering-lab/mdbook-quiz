import toml from "@iarna/toml";
import fs from "fs-extra";
import path from "path";

import "./build-quiz.scss";

let tomlPath = process.argv[2];
if (!tomlPath) throw new Error(`Must specify a path to a TOML quiz file`);

let quiz = toml.parse(fs.readFileSync(tomlPath, "utf-8"));
let quizAttr = JSON.stringify(quiz)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link type="text/css" rel="stylesheet" href="embed.css" />
    <link type="text/css" rel="stylesheet" href="build-quiz.css" />
    <title>Quiz</title>
  </head>
  <body>
    <div id="container">
      <div class="quiz-placeholder" data-quiz-name="Quiz" data-quiz-questions="${quizAttr}"></div>
    </div>
    <script src="embed.js" type="text/javascript"></script>
  </body>
</html>
`;

let QUIZ_DIR = path.join(process.cwd(), "quiz");
fs.mkdirp(QUIZ_DIR);

let ASSETS = ["embed.js", "embed.css", "build-quiz.css"];
ASSETS.forEach(asset => {
  fs.copyFileSync(path.join(__dirname, asset), path.join(QUIZ_DIR, asset));
});

fs.writeFileSync(path.join(QUIZ_DIR, "index.html"), html);
console.log("Quiz successfully generated into the quiz/ directory.");
