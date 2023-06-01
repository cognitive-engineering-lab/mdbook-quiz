import { QuizView, renderIde } from "@wcrichto/quiz";
import type { Quiz } from "@wcrichto/quiz-schema";
import * as rustEditor from "@wcrichto/rust-editor";
import React from "react";
import * as ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import "./index.scss";

let onError = ({ error }: { error: Error }) => {
  document.body.style.overflowY = "auto";

  window.telemetry?.log("runtime_error", {
    error: error.stack || error.message,
  });

  return (
    <div className="mdbook-quiz">
      <strong>The quiz component encountered a runtime error!</strong> Sorry for
      the inconvenience. The error has been reported to the developers, and we
      will try to fix it soon.
    </div>
  );
};

let initQuizzes = () => {
  if (rustEditor.raSetup) {
    rustEditor.raSetup("./quiz");
    renderIde(document.documentElement);
  }

  document.querySelectorAll(".quiz-placeholder").forEach(el => {
    let divEl = el as HTMLDivElement;
    let name = divEl.dataset.quizName!;
    let quiz: Quiz = JSON.parse(divEl.dataset.quizQuestions!);
    let root = ReactDOM.createRoot(el);
    let fullscreen = divEl.dataset.quizFullscreen !== undefined;
    let cacheAnswers = divEl.dataset.quizCacheAnswers !== undefined;
    root.render(
      <ErrorBoundary FallbackComponent={onError}>
        <QuizView
          name={name}
          quiz={quiz}
          fullscreen={fullscreen}
          cacheAnswers={cacheAnswers}
          allowRetry
        />
      </ErrorBoundary>
    );
  });
};

// It's important to wait for DOMContentLoaded because mdbook-quiz depends
// on globals provided by scripts loaded via mdbook, which may be in the page
// footer and therefore load after this script
window.addEventListener("DOMContentLoaded", initQuizzes, false);
