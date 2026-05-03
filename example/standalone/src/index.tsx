import { type Quiz, QuizView } from "@wcrichto/quiz";
import hljs from "highlight.js";
import React from "react";
import ReactDOM from "react-dom/client";
import toml from "smol-toml";

import quizStr from "./quiz-example.toml?raw";
import "./telemetry";

let App = () => {
  let quiz = toml.parse(quizStr) as any as Quiz;
  return (
    <div>
      <h1>Rust Async quiz</h1>
      <p>
        This quiz will check your understanding of async concepts. We will also
        collect your responses anonymously to facilitate our research about the
        efficacy of RepoQuest. Taking this quiz will help us do better research!
      </p>
      <QuizView
        name="example-quiz"
        quiz={quiz}
        syntaxHighlighter={hljs.highlightBlock}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
