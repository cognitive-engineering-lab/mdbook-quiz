import classNames from "classnames";
import _ from "lodash";
import { action, toJS } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import hash from "object-hash";
import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import type { Question } from "../bindings/Question";
import type { Quiz } from "../bindings/Quiz";
import {
  AnswerView,
  QuestionView,
  type TaggedAnswer,
  getQuestionMethods
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
  constructor(
    readonly quizName: string,
    readonly quizHash: string
  ) {}

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
      wrongAnswers
    };
    localStorage.setItem(this.storageKey(), JSON.stringify(storedAnswers));
  }

  load(): StoredAnswers | undefined {
    let storedAnswersJson = localStorage.getItem(this.storageKey());
    if (storedAnswersJson) {
      let storedAnswers: StoredAnswers = JSON.parse(storedAnswersJson);
      if (storedAnswers.quizHash === this.quizHash) {
        return storedAnswers;
      }
    }
  }
}

let ExitExplanation = ({
  wrapperRef
}: {
  wrapperRef: React.RefObject<HTMLDivElement>;
}) => {
  let [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (expanded) {
      wrapperRef.current!.scrollTo({
        top: wrapperRef.current!.offsetHeight,
        behavior: "smooth"
      });
    }
  }, [expanded]);
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
  autoStart
}: {
  quiz: Quiz;
  answerStorage: AnswerStorage;
  cacheAnswers?: boolean;
  autoStart?: boolean;
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
        (stored.attempt > 0 ? _.range(quiz.questions.length) : undefined)
    };
  } else {
    return {
      started: autoStart || false,
      index: 0,
      attempt: 0,
      confirmedDone: false,
      answers: []
    };
  }
};

interface HeaderProps {
  state: QuizState;
  ended: boolean;
}

let Header = observer(({ state, ended }: HeaderProps) => {
  let { quiz } = useContext(QuizConfigContext)!;
  return (
    <header>
      <h3>Quiz</h3>
      <div className="counter">
        {state.started ? (
          !ended && (
            <>
              Question{" "}
              {(state.attempt === 0
                ? state.index
                : state.wrongAnswers!.indexOf(state.index)) + 1}{" "}
              /{" "}
              {state.attempt === 0
                ? quiz.questions.length
                : state.wrongAnswers!.length}
            </>
          )
        ) : (
          <>
            {quiz.questions.length} question
            {quiz.questions.length > 1 && "s"}
          </>
        )}
      </div>
    </header>
  );
});

interface AnswerReviewProps {
  state: QuizState;
  nCorrect: number;
  onRetry: () => void;
  onGiveUp: () => void;
}

let AnswerReview = ({
  state,
  nCorrect,
  onRetry,
  onGiveUp
}: AnswerReviewProps) => {
  let { quiz, name } = useContext(QuizConfigContext)!;
  let confirm = !state.confirmedDone && (
    <p style={{ marginBottom: "1em" }}>
      You can either{" "}
      <button type="button" onClick={onRetry}>
        retry the quiz
      </button>{" "}
      or{" "}
      <button type="button" onClick={onGiveUp}>
        see the correct answers
      </button>
      .
    </p>
  );
  let questionTitles = generateQuestionTitles(quiz);
  return (
    <>
      <h3>Answer Review</h3>
      <p>
        You answered{" "}
        <strong>
          {nCorrect}/{quiz.questions.length}
        </strong>{" "}
        questions correctly.
      </p>
      {confirm}
      {quiz.questions.map((question, i) => {
        let { answer, correct } = state.answers[i];
        return (
          <div className="answer-wrapper" key={i}>
            <AnswerView
              index={i + 1}
              title={questionTitles[i]}
              multipart={quiz.multipart}
              quizName={name}
              question={question}
              userAnswer={answer}
              correct={correct}
              showCorrect={state.confirmedDone}
            />
          </div>
        );
      })}
      {confirm}
    </>
  );
};

export let useCaptureMdbookShortcuts = (capture: boolean) => {
  useLayoutEffect(() => {
    if (capture) {
      let captureKeyboard = (e: KeyboardEvent) => e.stopPropagation();
      let captureTouchscreen = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

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

      // Same thing but for touch events, so the screen beneath isn't scrolled.
      document.documentElement.addEventListener(
        "touchmove",
        captureTouchscreen,
        false
      );

      return () => {
        document.documentElement.removeEventListener(
          "keydown",
          captureKeyboard,
          false
        );
        document.documentElement.removeEventListener(
          "touchmove",
          captureTouchscreen
        );
      };
    }
  }, [capture]);
};

export interface QuizViewConfig {
  name: string;
  quiz: Quiz;
  fullscreen?: boolean;
  cacheAnswers?: boolean;
  allowRetry?: boolean;
  showBugReporter?: boolean;
  autoStart?: boolean;
}

export type QuizViewProps = QuizViewConfig & {
  onFinish?: (answers: TaggedAnswer[]) => void;
};

export let QuizConfigContext = React.createContext<QuizViewConfig | null>(null);

let aCode = "a".charCodeAt(0);
export let generateQuestionTitles = (quiz: Quiz): string[] => {
  let groups: Question[][] = [];
  let group = undefined;
  let part = undefined;
  quiz.questions.forEach(q => {
    if (q.multipart) {
      if (q.multipart === part) {
        group.push(q);
      } else {
        group = [q];
        groups.push(group);
      }
      part = q.multipart;
    } else {
      group = [q];
      groups.push(group);
    }
  });

  return groups.flatMap((g, i) =>
    g.map((q, j) => {
      let title = (i + 1).toString();
      if (q.multipart) title += String.fromCharCode(aCode + j);
      return title;
    })
  );
};

export let QuizView: React.FC<QuizViewProps> = observer(
  ({ onFinish, ...config }) => {
    let [quizHash] = useState(() => hash.MD5(config.quiz));
    let answerStorage = new AnswerStorage(config.name, quizHash);
    let questionStates = useMemo(
      () =>
        config.quiz.questions.map(q => {
          let methods = getQuestionMethods(q.type);
          return methods.questionState?.(q.prompt, q.answer);
        }),
      [config.quiz]
    );
    let state = useLocalObservable(() =>
      loadState({
        quiz: config.quiz,
        answerStorage,
        cacheAnswers: config.cacheAnswers,
        autoStart: config.autoStart
      })
    );

    let saveToCache = () => {
      if (config.cacheAnswers)
        answerStorage.save(
          state.answers,
          state.confirmedDone,
          state.attempt,
          state.wrongAnswers
        );
    };

    // Don't allow any keyboard inputs to reach external listeners
    // while the quiz is active (e.g. to avoid using the search box).
    let ended = state.index === config.quiz.questions.length;
    let inProgress = state.started && !ended;
    useCaptureMdbookShortcuts(inProgress);

    // Restore the user's scroll position after leaving fullscreen mode
    let [lastTop, setLastTop] = useState<number | undefined>();
    let showFullscreen = inProgress && (config.fullscreen ?? false);
    useLayoutEffect(() => {
      document.body.style.overflowY = showFullscreen ? "hidden" : "auto";
      if (showFullscreen) {
        setLastTop(window.scrollY + 100);
      } else if (config.fullscreen && lastTop !== undefined) {
        window.scrollTo(0, lastTop);
      }
    }, [showFullscreen]);

    let onSubmit = action((answer: TaggedAnswer) => {
      answer = _.cloneDeep(answer);

      if (state.attempt === 0) {
        state.answers.push(answer);
        state.index += 1;
      } else {
        state.answers[state.index] = answer;

        let wrongAnswerIdx = state.wrongAnswers!.findIndex(
          n => n === state.index
        );
        if (wrongAnswerIdx === state.wrongAnswers!.length - 1)
          state.index = config.quiz.questions.length;
        else state.index = state.wrongAnswers![wrongAnswerIdx + 1];
      }

      window.telemetry?.log("answers", {
        quizName: config.name,
        quizHash,
        answers: state.answers,
        attempt: state.attempt
      });

      if (state.index === config.quiz.questions.length) {
        let wrongAnswers = state.answers
          .map((a, i) => ({ a, i }))
          .filter(({ a }) => !a.correct);
        if (wrongAnswers.length === 0 || !config.allowRetry) {
          state.confirmedDone = true;
        } else {
          state.wrongAnswers = wrongAnswers.map(({ i }) => i);
        }

        saveToCache();
        onFinish?.(toJS(state.answers));
      }
    });

    let nCorrect = state.answers.filter(a => a.correct).length;

    // HACK: need this component to observe confirmedDone
    // on first render...
    state.confirmedDone;

    let questionTitles = generateQuestionTitles(config.quiz);

    let body = (
      <section>
        {state.started ? (
          ended ? (
            <AnswerReview
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
              multipart={config.quiz.multipart}
              index={state.index}
              title={questionTitles[state.index]}
              attempt={state.attempt}
              question={config.quiz.questions[state.index]}
              questionState={questionStates[state.index]}
              onSubmit={onSubmit}
            />
          )
        ) : (
          <button
            type="button"
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
      expanded: showFullscreen
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
    let wrapperRef = useRef<HTMLDivElement | undefined>();

    return (
      <QuizConfigContext.Provider value={config}>
        <div ref={wrapperRef} className={wrapperClass}>
          <div className="mdbook-quiz">
            {showFullscreen && (
              <>
                {exitButton}
                <ExitExplanation wrapperRef={wrapperRef} />
              </>
            )}
            <Header state={state} ended={ended} />
            {body}
          </div>
        </div>
      </QuizConfigContext.Provider>
    );
  }
);
