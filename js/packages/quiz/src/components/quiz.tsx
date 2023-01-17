import { Quiz } from "@wcrichto/quiz-schema";
import classNames from "classnames";
import _ from "lodash";
import { action, toJS } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import hash from "object-hash";
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  AnswerView,
  QuestionView,
  TaggedAnswer,
  getQuestionMethods,
} from "../questions/mod";

interface StoredAnswers {
  answers: TaggedAnswer[];
  confirmedDone: boolean;
  quizHash: string;
  attempt: number;
  wrongAnswers?: number[];
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

  save(
    answers: TaggedAnswer[],
    confirmedDone: boolean,
    attempt: number,
    wrongAnswers?: number[]
  ) {
    let storedAnswers: StoredAnswers = {
      answers,
      confirmedDone,
      attempt,
      quizHash: this.quizHash,
      wrongAnswers,
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

let ExitExplanation = () => {
  let [expanded, setExpanded] = useState(false);
  return (
    <div className="exit-explanation">
      <div className="trigger" onClick={() => setExpanded(!expanded)}>
        Why is this quiz fullscreen?
      </div>
      <div style={{ display: expanded ? "block" : "none" }}>
        We want to know how much you are learning that can be recalled without
        assistance. Please complete the quiz without re-reading the text, e.g.
        by opening it in another tab.
      </div>
    </div>
  );
};

interface QuizState {
  started: boolean;
  index: number;
  confirmedDone: boolean;
  attempt: number;
  answers: TaggedAnswer[];
  wrongAnswers?: number[];
}

let loadState = ({
  quiz,
  answerStorage,
  cacheAnswers,
}: {
  quiz: Quiz;
  answerStorage: AnswerStorage;
  cacheAnswers?: boolean;
}): QuizState => {
  let stored = answerStorage.load();

  // If an outdated quiz didn't store wrongAnswers, then we need to
  // clear that cache.
  // TODO: we should be able to remove this code eventually?
  let badSchema =
    stored &&
    stored.attempt > 0 &&
    !stored.confirmedDone &&
    !stored.wrongAnswers;

  if (cacheAnswers && stored && !badSchema) {
    return {
      started: true,
      index: quiz.questions.length,
      answers: stored.answers,
      // note: need to provide defaults if schema changes
      confirmedDone: stored.confirmedDone || false,
      attempt: stored.attempt || 0,
      wrongAnswers:
        stored.wrongAnswers ||
        (stored.attempt > 0 ? _.range(quiz.questions.length) : undefined),
    };
  } else {
    return {
      started: false,
      index: 0,
      attempt: 0,
      confirmedDone: false,
      answers: [],
    };
  }
};

let Header = observer(
  ({
    quiz,
    state,
    ended,
  }: {
    quiz: Quiz;
    state: QuizState;
    ended: boolean;
  }) => (
    <header>
      <h3>Quiz</h3>
      <div className="counter">
        {state.started ? (
          !ended ? (
            <>
              Question{" "}
              {(state.attempt == 0
                ? state.index
                : state.wrongAnswers!.indexOf(state.index)) + 1}{" "}
              /{" "}
              {state.attempt == 0
                ? quiz.questions.length
                : state.wrongAnswers!.length}
            </>
          ) : null
        ) : (
          <>
            {quiz.questions.length} question
            {quiz.questions.length > 1 ? "s" : null}
          </>
        )}
      </div>
    </header>
  )
);

let AnswerReview = ({
  quiz,
  state,
  name,
  nCorrect,
  onRetry,
  onGiveUp,
}: {
  quiz: Quiz;
  state: QuizState;
  name: string;
  nCorrect: number;
  onRetry: () => void;
  onGiveUp: () => void;
}) => (
  <>
    <h3>Answer Review</h3>
    <p>
      You answered{" "}
      <strong>
        {nCorrect}/{quiz.questions.length}
      </strong>{" "}
      questions correctly.
    </p>
    {!state.confirmedDone ? (
      <p style={{ marginBottom: "1em" }}>
        You can either <button onClick={onRetry}>retry the quiz</button> or{" "}
        <button onClick={onGiveUp}>see the correct answers</button>.
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
);

export interface QuizViewProps {
  name: string;
  quiz: Quiz;
  fullscreen?: boolean;
  cacheAnswers?: boolean;
  allowRetry?: boolean;
  onFinish?: (answers: TaggedAnswer[]) => void;
}

export let QuizView: React.FC<QuizViewProps> = observer(
  ({ quiz, name, fullscreen, cacheAnswers, allowRetry, onFinish }) => {
    let [quizHash] = useState(() => hash.MD5(quiz));
    let answerStorage = new AnswerStorage(name, quizHash);
    let questionStates = useMemo(
      () =>
        quiz.questions.map(q => {
          let methods = getQuestionMethods(q.type);
          return (
            methods.questionState && methods.questionState(q.prompt, q.answer)
          );
        }),
      [quiz]
    );
    let state = useLocalObservable(() =>
      loadState({ quiz, answerStorage, cacheAnswers })
    );

    let saveToCache = () => {
      if (cacheAnswers)
        answerStorage.save(
          state.answers,
          state.confirmedDone,
          state.attempt,
          state.wrongAnswers
        );
    };

    // Don't allow any keyboard inputs to reach external listeners
    // while the quiz is active (e.g. to avoid using the search box).
    let ended = state.index == quiz.questions.length;
    let showFullscreen = fullscreen && state.started && !ended;
    let ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      document.body.style.overflowY = showFullscreen ? "hidden" : "auto";

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
        document.documentElement.addEventListener(
          "keydown",
          captureKeyboard,
          false
        );

        return () =>
          document.documentElement.removeEventListener(
            "keydown",
            captureKeyboard,
            false
          );
      } else if (fullscreen && state.started && !state.confirmedDone) {
        let top =
          ref.current!.getBoundingClientRect().top +
          document.documentElement.scrollTop;
        window.scrollTo({ top: top - 20 });
      }
    }, [showFullscreen]);

    let onSubmit = action((answer: TaggedAnswer) => {
      answer = _.cloneDeep(answer);

      if (state.attempt == 0) {
        state.answers.push(answer);
        state.index += 1;
      } else {
        state.answers[state.index] = answer;

        let wrongAnswerIdx = state.wrongAnswers!.findIndex(
          n => n == state.index
        );
        if (wrongAnswerIdx == state.wrongAnswers!.length - 1)
          state.index = quiz.questions.length;
        else state.index = state.wrongAnswers![wrongAnswerIdx + 1];
      }

      window.telemetry?.log("answers", {
        quizName: name,
        quizHash,
        answers: state.answers,
        attempt: state.attempt,
      });

      if (state.index == quiz.questions.length) {
        let wrongAnswers = state.answers
          .map((a, i) => ({ a, i }))
          .filter(({ a }) => !a.correct);
        if (wrongAnswers.length == 0 || !allowRetry) {
          state.confirmedDone = true;
        } else {
          state.wrongAnswers = wrongAnswers.map(({ i }) => i);
        }

        saveToCache();
        onFinish && onFinish(toJS(state.answers));
      }
    });

    let nCorrect = state.answers.filter(a => a.correct).length;
    state.confirmedDone; // HACK: need this component to observe confirmedDone on first render...

    let body = (
      <section>
        {state.started ? (
          ended ? (
            <AnswerReview
              quiz={quiz}
              name={name}
              state={state}
              nCorrect={nCorrect}
              onRetry={action(() => {
                state.index = state.wrongAnswers![0];
                state.attempt += 1;
              })}
              onGiveUp={action(() => {
                state.confirmedDone = true;
                saveToCache();
              })}
            />
          ) : (
            <QuestionView
              key={state.index}
              quizName={name}
              index={state.index + 1}
              attempt={state.attempt}
              question={quiz.questions[state.index]}
              questionState={questionStates[state.index]}
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
    let onExit = action(() => {
      state.started = false;
      state.index = 0;
      state.answers = [];
    });
    let exitButton = (
      <div className="exit" onClick={onExit}>
        ✕
      </div>
    );

    return (
      <div className={wrapperClass} ref={ref}>
        <div className="mdbook-quiz">
          {showFullscreen ? (
            <>
              {exitButton}
              <ExitExplanation />
            </>
          ) : null}
          <Header quiz={quiz} state={state} ended={ended} />
          {body}
        </div>
      </div>
    );
  }
);
