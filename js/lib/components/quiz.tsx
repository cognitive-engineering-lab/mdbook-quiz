import classNames from "classnames";
import _ from "lodash";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import hash from "object-hash";
import React, { useEffect, useState } from "react";

import { AnswerView, Question, QuestionView, TaggedAnswer } from "../questions/mod";

export interface Quiz {
  questions: Question[];
}

export interface QuizViewProps {
  name: string;
  quiz: Quiz;
  fullscreen?: boolean;
  cacheAnswers?: boolean;
}

interface StoredAnswers {
  answers: TaggedAnswer[];
  confirmedDone: boolean;
  quizHash: string;
  attempt: number;
}

declare global {
  var telemetry:
    | {
        log: (endpoint: string, payload: any) => void;
      }
    | undefined;
}

class AnswerStorage {
  constructor(readonly quizName: string, readonly quizHash: string) {}

  storageKey = () => `mdbook-quiz:${this.quizName}`;

  save(answers: TaggedAnswer[], confirmedDone: boolean, attempt: number) {
    let storedAnswers: StoredAnswers = {
      answers,
      confirmedDone,
      attempt,
      quizHash: this.quizHash,
    };
    localStorage.setItem(this.storageKey(), JSON.stringify(storedAnswers));
  }

  load(): StoredAnswers | undefined {
    let storedAnswersJson = localStorage.getItem(this.storageKey());
    if (storedAnswersJson) {
      let storedAnswers: StoredAnswers = JSON.parse(storedAnswersJson);
      if (storedAnswers.quizHash == this.quizHash) {
        return storedAnswers;
      }
    }
  }
}

export let QuizView: React.FC<QuizViewProps> = observer(
  ({ quiz, name, fullscreen, cacheAnswers }) => {
    let [quizHash] = useState(() => hash.MD5(quiz));
    let answerStorage = new AnswerStorage(name, quizHash);
    let state = useLocalObservable<{
      started: boolean;
      index: number;
      confirmedDone: boolean;
      attempt: number;
      answers: TaggedAnswer[];
    }>(() => {
      let stored = answerStorage.load();
      if (cacheAnswers && stored) {
        return {
          started: true,
          index: quiz.questions.length,
          answers: stored.answers,
          // note: need to provide defaults if schema changes
          confirmedDone: stored.confirmedDone || false,
          attempt: stored.attempt || 0,
        };
      } else {
        return { started: false, index: 0, attempt: 0, confirmedDone: false, answers: [] };
      }
    });

    let saveToCache = () => {
      if (cacheAnswers) {
        answerStorage.save(state.answers, state.confirmedDone, state.attempt);
      }
    };

    let n = quiz.questions.length;
    let nCorrect = state.answers.filter(a => a.correct).length;
    let ended = state.index == n;
    let showFullscreen = fullscreen && state.started && !ended;

    // Don't allow any keyboard inputs to reach external listeners
    // while the quiz is active (e.g. to avoid using the search box).
    useEffect(() => {
      if (showFullscreen) {
        let captureKeyboard = (e: KeyboardEvent) => e.stopPropagation();

        // This gets added specifically to document.documentElement rather than document
        // so bubbling events will hit this listener before ones added via document.addEventListener(...).
        // All of the problematic mdBook interactions are created that way, so we ensure that
        // the keyboard event does not propagate to those listeners.
        //
        // However, some widgets like Codemirror require keydown events but on local elements.
        // So we can't just stopPropagation in the capture phase, or those widgets will break.
        // This is the compromise!
        document.documentElement.addEventListener("keydown", captureKeyboard, false);

        return () => document.removeEventListener("keydown", captureKeyboard, false);
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
      window.telemetry?.log("answers", {
        quizName: name,
        quizHash,
        answers: state.answers,
        attempt: state.attempt,
      });

      if (state.index == n) {
        if (_.every(state.answers, a => a.correct)) {
          state.confirmedDone = true;
        }

        saveToCache();
      }
    });

    let body = (
      <section>
        {state.started ? (
          ended ? (
            <>
              <h3>Answer Review</h3>
              <p>
                You answered{" "}
                <strong>
                  {nCorrect}/{n}
                </strong>{" "}
                questions correctly.
              </p>
              {!state.confirmedDone ? (
                <p style={{ marginBottom: "1em" }}>
                  You can either{" "}
                  <button
                    onClick={action(() => {
                      state.index = 0;
                      state.answers = [];
                      state.attempt += 1;
                    })}
                  >
                    retry the quiz
                  </button>{" "}
                  or{" "}
                  <button
                    onClick={action(() => {
                      state.confirmedDone = true;
                      saveToCache();
                    })}
                  >
                    see the correct answers
                  </button>
                  .
                </p>
              ) : null}
              {quiz.questions.map((question, i) => {
                let { answer, correct } = state.answers[i];
                return (
                  <div className="answer-wrapper" key={i}>
                    <AnswerView
                      index={i + 1}
                      quizName={name}
                      question={question}
                      userAnswer={answer}
                      correct={correct}
                      showCorrect={state.confirmedDone}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <QuestionView
              key={state.index}
              quizName={name}
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
