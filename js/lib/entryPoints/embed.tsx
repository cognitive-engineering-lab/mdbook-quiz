import React from "react";
import * as ReactDOM from "react-dom/client";

import "../../index.scss";
import { Quiz, QuizView } from "../components/quiz";

let initQuizzes = () => {
  document.querySelectorAll(".quiz-placeholder").forEach(el => {
    let divEl = el as HTMLDivElement;
    let name = divEl.dataset.quizName!;
    let quiz: Quiz = JSON.parse(divEl.dataset.quizQuestions!);
    let root = ReactDOM.createRoot(el);
    let fullscreen = divEl.dataset.quizFullscreen !== undefined;
    let cacheAnswers = divEl.dataset.quizCacheAnswers !== undefined;
    root.render(
      <QuizView name={name} quiz={quiz} fullscreen={fullscreen} cacheAnswers={cacheAnswers} />
    );
  });
};

// It's important to wait for DOMContentLoaded because mdbook-quiz depends
// on globals provided by scripts loaded via mdbook, which may be in the page
// footer and therefore load after this script
window.addEventListener("DOMContentLoaded", initQuizzes, false);
