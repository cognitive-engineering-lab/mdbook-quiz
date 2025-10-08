import { type Quiz, QuizView, renderIde } from "@wcrichto/quiz";
import * as rustEditor from "@wcrichto/rust-editor";
import React from "react";
import * as ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

//@ts-ignore
import hljs from "highlight.js";

import "./index.scss";

let onError = ({ error }: { error: Error }) => {
  document.body.style.overflowY = "auto";

  window.telemetry?.log("runtime_error", {
    error: error.stack || error.message
  });

  return (
    <div className="mdbook-quiz">
      <strong>The quiz component encountered a runtime error!</strong> Sorry for
      the inconvenience. The error has been reported to the developers, and we
      will try to fix it soon.
    </div>
  );
};

// declare global {
//   var hljs: {
//     highlightBlock: (code: HTMLElement) => void;
//   };
// }

let initQuizzes = () => {
  if (rustEditor.raSetup) {
    rustEditor.raSetup("./quiz");
    renderIde(document.documentElement);
  }

  document.querySelectorAll(".quiz-placeholder").forEach(el => {
    let divEl = el as HTMLDivElement;
    let name = JSON.parse(divEl.dataset.quizName!) as string;
    let quiz = JSON.parse(divEl.dataset.quizQuestions!) as Quiz;
    let root = ReactDOM.createRoot(el);

    let maybeParseJson = <T,>(s: string | undefined): T | undefined =>
      s !== undefined ? JSON.parse(s) : undefined;
    let fullscreen =
      maybeParseJson<boolean>(divEl.dataset.quizFullscreen) === true;
    let cacheAnswers =
      maybeParseJson<boolean>(divEl.dataset.quizCacheAnswers) === true;
    let showBugReporter =
      maybeParseJson<boolean>(divEl.dataset.quizShowBugReporter) === true;
    let initialText = maybeParseJson<string>(divEl.dataset.quizInitialText);

    let syntaxHighlighter = hljs.highlightElement;

    root.render(
      <ErrorBoundary FallbackComponent={onError}>
        <QuizView
          name={name}
          quiz={quiz}
          fullscreen={fullscreen}
          cacheAnswers={cacheAnswers}
          showBugReporter={showBugReporter}
          initialText={initialText}
          syntaxHighlighter={syntaxHighlighter}
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
