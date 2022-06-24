import _ from "lodash";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import React, { useState } from "react";
import axios from "axios";
import { AnswerView, Question, QuestionView } from "../questions/mod";
import classNames from "classnames";

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

export let QuizView: React.FC<QuizViewProps> = observer(
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
    let ended = state.index == n;

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
          ended ? (
            <>
              <h3>Answer Review</h3>
              {quiz.questions.map((question, i) => (
                <div className="answer-wrapper" key={i}>
                  <AnswerView
                    key={i}
                    index={i + 1}
                    question={question}
                    userAnswer={state.answers[i]}
                  />
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

    let showFullscreen = fullscreen && state.started && !ended;
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

    if (showFullscreen) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "auto";
    }

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
