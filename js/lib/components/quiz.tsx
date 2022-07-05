import classNames from "classnames";
import _ from "lodash";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import React, { useEffect, useState } from "react";

import { Logger, LoggerContext } from "../logging";
import { AnswerView, Question, QuestionView } from "../questions/mod";

export interface Quiz {
  questions: Question[];
}

export interface QuizViewProps {
  name: string;
  quiz: Quiz;
  user?: string;
  logEndpoint?: string;
  fullscreen?: boolean;
  cacheAnswers?: boolean;
  commitHash?: string;
}

let quizAnswersStorageKey = (name: string): string => `quizAnswers:${name}`;

export let QuizView: React.FC<QuizViewProps> = observer(
  ({ quiz, user, name, logEndpoint, fullscreen, cacheAnswers, commitHash }) => {
    let state = useLocalObservable<{
      started: boolean;
      index: number;
      answers: any[];
    }>(() => {
      let answers = localStorage.getItem(quizAnswersStorageKey(name));
      if (cacheAnswers && answers !== null) {
        return {
          started: true,
          index: quiz.questions.length,
          answers: JSON.parse(answers),
        };
      } else {
        return { started: false, index: 0, answers: [] };
      }
    });
    let [logger] = useState(() =>
      logEndpoint ? new Logger(logEndpoint, name, quiz, commitHash, user) : null
    );

    let n = quiz.questions.length;
    let ended = state.index == n;
    let showFullscreen = fullscreen && state.started && !ended;

    // Don't allow any keyboard inputs to reach external listeners
    // while the quiz is active (e.g. to avoid using the search box).
    useEffect(() => {
      if (showFullscreen) {
        let captureKeyboard = (e: KeyboardEvent) => {
          e.stopPropagation();
        };

        // the "true" ensures this event listener will run before the
        // default ones provided by mdBook
        document.addEventListener("keydown", captureKeyboard, true);

        return () => document.removeEventListener("keydown", captureKeyboard, true);
      }
    }, [showFullscreen]);

    let header = (
      <header>
        <h3>Quiz</h3>
        <div className="counter">
          {state.started ? (
            !ended ? (
              <>
                Question {state.index + 1} / {n}
              </>
            ) : null
          ) : (
            <>
              {n} question{n > 1 ? "s" : null}
            </>
          )}
        </div>
      </header>
    );

    let onSubmit = action((answer: any) => {
      state.answers.push(_.cloneDeep(answer));
      state.index += 1;
      logger?.logAnswers(state.answers);

      if (cacheAnswers && state.index == n) {
        localStorage.setItem(quizAnswersStorageKey(name), JSON.stringify(state.answers));
      }
    });

    let body = (
      <section>
        {state.started ? (
          ended ? (
            <>
              <h3>Answer Review</h3>
              {quiz.questions.map((question, i) => (
                <div className="answer-wrapper" key={i}>
                  <AnswerView index={i + 1} question={question} userAnswer={state.answers[i]} />
                </div>
              ))}
            </>
          ) : (
            <QuestionView
              key={state.index}
              index={state.index + 1}
              question={quiz.questions[state.index]}
              onSubmit={onSubmit}
            />
          )
        ) : (
          <button
            className="start"
            onClick={action(() => {
              state.started = true;
            })}
          >
            Start
          </button>
        )}
      </section>
    );

    let wrapperClass = classNames("mdbook-quiz-wrapper", {
      expanded: showFullscreen,
    });
    let exitButton = (
      <div
        className="exit"
        onClick={action(() => {
          state.started = false;
          state.index = 0;
          state.answers = [];
        })}
      >
        ✕
      </div>
    );
    let ExitExplanation = () => {
      let [expanded, setExpanded] = useState(false);
      return (
        <div className="exit-explanation">
          <div className="trigger" onClick={() => setExpanded(!expanded)}>
            Why is this quiz fullscreen?
          </div>
          <div style={{ display: expanded ? "block" : "none" }}>
            We want to know how much you are learning that can be recalled without assistance.
            Please complete the quiz without re-reading the text, e.g. by opening it in another tab.
          </div>
        </div>
      );
    };

    if (showFullscreen) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "auto";
    }

    return (
      <LoggerContext.Provider value={logger}>
        <div className={wrapperClass}>
          <div className="mdbook-quiz">
            {showFullscreen ? (
              <>
                {exitButton}
                <ExitExplanation />
              </>
            ) : null}
            {header}
            {body}
          </div>
        </div>
      </LoggerContext.Provider>
    );
  }
);
