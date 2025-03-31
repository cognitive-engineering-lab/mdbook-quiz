import { type Quiz, QuizView } from "@wcrichto/quiz";
import React from "react";
import ReactDOM from "react-dom/client";
import toml from "smol-toml";

import quizStr from "./quiz-example.toml?raw";
import "./telemetry";

let App = () => {
  let quiz = toml.parse(quizStr) as any as Quiz;
  return (
    <div>
      <h1>Example quiz</h1>
      <QuizView name="example-quiz" quiz={quiz} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
