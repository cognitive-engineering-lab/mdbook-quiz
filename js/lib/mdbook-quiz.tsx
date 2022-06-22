import _ from "lodash";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import React, { useState } from "react";
import * as ReactDOM from "react-dom/client";
import axios from "axios";
import * as uuid from "uuid";
import { Question, QuestionView } from "./questions/mod";
import classNames from "classnames";

import "../css/index.scss";

export interface Quiz {
  questions: Question[];
}

export interface QuizLog {
  user?: string;
  name: string;
  timestamp: number;
  answers: any[];
}

export interface QuizViewProps {
  name: string;
  quiz: Quiz;
  user?: string;
  logEndpoint?: string;
  fullscreen?: boolean;
}

let QuizView: React.FC<QuizViewProps> = observer(
  ({ quiz, user, name, logEndpoint, fullscreen }) => {
    let state = useLocalObservable<{
      started: boolean;
      index: number;
      answers: any[];
    }>(() => ({
      started: false,
      index: 0,
      answers: [],
    }));

    let n = quiz.questions.length;

    let header = (
      <header>
        <h3>Quiz</h3>
        <div className="counter">
          {state.started ? (
            state.index < n ? (
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

      if (logEndpoint) {
        let timestamp = new Date().getTime();
        let log: QuizLog = {
          user,
          name,
          timestamp,
          answers: state.answers,
        };
        axios.post(logEndpoint, log);
      }
    });

    let body = (
      <section>
        {state.started ? (
          state.index == n ? (
            <>You have completed the quiz!</>
          ) : (
            <QuestionView
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

    let showFullscreen = fullscreen && state.started;
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
            We want to know how much you are learning that can be recalled
            without assistance. Please complete the quiz without re-reading the
            text, e.g. by opening it in another tab.
          </div>
        </div>
      );
    };

    return (
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
    );
  }
);

const USER_KEY = "__mdbook_quiz_user";
if (localStorage.getItem(USER_KEY) === null) {
  localStorage.setItem(USER_KEY, uuid.v4());
}
const userId = localStorage.getItem(USER_KEY)!;

document.querySelectorAll(".quiz-placeholder").forEach((el) => {
  let divEl = el as HTMLDivElement;
  let name = divEl.dataset.quizName!;
  let quiz: Quiz = JSON.parse(divEl.dataset.quizQuestions!);
  let root = ReactDOM.createRoot(el);
  let logEndpoint = divEl.dataset.quizLogEndpoint;
  let fullscreen = divEl.dataset.quizFullscreen !== undefined;
  root.render(
    <QuizView
      name={name}
      quiz={quiz}
      user={userId}
      logEndpoint={logEndpoint}
      fullscreen={fullscreen}
    />
  );
});
