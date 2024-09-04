import TOML from "@iarna/toml";
import { type Quiz, QuizView } from "@wcrichto/quiz";
import React from "react";
import ReactDOM from "react-dom/client";

import quizStr from "./quiz-example.toml?raw";
import "./telemetry";

let App = () => {
  let quiz = TOML.parse(quizStr) as any as Quiz;
  return (
    <div>
      <h1>Example quiz</h1>
      <QuizView name="example-quiz" quiz={quiz} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
