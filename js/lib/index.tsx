import _ from "lodash";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react";
import React, { useRef } from "react";
import * as ReactDOM from "react-dom/client";

import "../css/index.scss";
import "./consent.tsx";

export interface ShortAnswer {
  type: "ShortAnswer";
  prompt: string;
}

export interface Tracing {
  type: "Tracing";
  program: string;
}

export type Question = ShortAnswer | Tracing;

export interface Quiz {
  questions: Question[];
}

interface QuestionChild {
  getAnswer(): any;
}

class QuestionBase<Q extends Question> extends React.Component<{
  question: Q;
}> {
  container: React.RefObject<HTMLDivElement>;

  constructor(props: any) {
    super(props);
    this.container = React.createRef();
  }
}

let Prompt: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <div className="prompt">
    <h4>Prompt</h4>
    {children}
  </div>
);

let Response: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <form className="response">
    <h4>Response</h4>
    {children}
  </form>
);

let splitHljsOutput = (html: string): string[] => {
  let parser = new DOMParser();
  let dom = parser.parseFromString(html, "text/html");
  let lines: string[][] = [[]];
  let curLine = () => lines[lines.length - 1];
  dom.body.childNodes.forEach((child) => {
    if (child.nodeType == Node.TEXT_NODE) {
      let content = child.textContent!;
      let childLines = content.split("\n");
      if (childLines.length > 1) {
        curLine().push(childLines[0]);

        childLines.slice(1, -1).forEach((childLine) => {
          lines.push([childLine]);
        });

        lines.push([childLines[childLines.length - 1]]);
      } else {
        curLine().push(content);
      }
    } else {
      curLine().push((child as any).outerHTML);
    }
  });

  return lines.map((line) => line.join(""));
};

let Snippet: React.FC<{ snippet: string }> = ({ snippet }) => {
  let ref = useRef(null);
  let hljs = (window as any).hljs;
  let highlighted: string = hljs.highlight("rust", snippet).value;

  return (
    <pre ref={ref}>
      {splitHljsOutput(highlighted).map((line, i) => (
        <>
          <code
            key={i}
            className="language-rust"
            dangerouslySetInnerHTML={{ __html: line }}
          />
          {"\n"}
        </>
      ))}
    </pre>
  );
};

class ShortAnswerView
  extends QuestionBase<ShortAnswer>
  implements QuestionChild
{
  getAnswer() {
    let input = this.container.current!.querySelector(
      "input"
    )! as HTMLInputElement;
    return input.value;
  }

  render() {
    return (
      <div className="short-answer" ref={this.container}>
        <Prompt>
          <p>{this.props.question.prompt}</p>
        </Prompt>
        <Response>
          <input type="text" />
        </Response>
      </div>
    );
  }
}

class TracingView extends QuestionBase<Tracing> implements QuestionChild {
  state: {
    doesCompile?: boolean;
  } = {};

  getAnswer() {
    let container = this.container.current!;
    let explanation = container.querySelector("textarea")!.value;
    return { explanation, ...this.state };
  }

  render() {
    return (
      <div className="tracing" ref={this.container}>
        <Prompt>
          <p>
            Determine whether the program will pass the compiler. If it passes,
            say what will happen when it is executed. If it does not pass, say
            what kind of compiler error you will get.
          </p>
          <Snippet snippet={this.props.question.program} />
        </Prompt>
        <Response>
          <div className="response-block">
            This program:{" "}
            <span className="option">
              <input
                type="radio"
                name="doesCompile"
                id="doesCompile1"
                onClick={() =>
                  this.setState({ ...this.state, doesCompile: true })
                }
              />{" "}
              <label htmlFor="doesCompile1">does compile</label>
            </span>
            <span className="option-separator">OR</span>
            <span className="option">
              <input
                type="radio"
                name="doesCompile"
                id="doesCompile2"
                onClick={() =>
                  this.setState({ ...this.state, doesCompile: false })
                }
              />{" "}
              <label htmlFor="doesCompile2">does not compile</label>
            </span>
          </div>

          {this.state.doesCompile !== undefined ? (
            this.state.doesCompile ? (
              <div>
                <p>The output of this program will be:</p>
                <textarea></textarea>
              </div>
            ) : (
              <div>
                <p>The compiler will generate an error about:</p>
                <textarea></textarea>
              </div>
            )
          ) : null}
        </Response>
      </div>
    );
  }
}

let QuestionView: React.FC<{
  question: Question;
  onSubmit: (answer: any) => void;
}> = ({ question, onSubmit }) => {
  let ref = useRef<any>(null); // can't figure out how to avoid `any`
  let viewMapping = { ShortAnswer: ShortAnswerView, Tracing: TracingView };
  let View: any = viewMapping[question.type];

  return (
    <div className="question">
      {question.type == "ShortAnswer"}
      {View ? (
        <View ref={ref} question={question} />
      ) : (
        <>
          ERROR: unknown question type <code>{question.type}</code>
        </>
      )}
      <button onClick={() => onSubmit(ref.current!.getAnswer())}>Submit</button>
    </div>
  );
};

let QuizView: React.FC<{ quiz: Quiz }> = observer(({ quiz }) => {
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
  return (
    <div className="mdbook-quiz">
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
      <section>
        {state.started ? (
          state.index == n ? (
            <>You have completed the quiz!</>
          ) : (
            <QuestionView
              question={quiz.questions[state.index]}
              onSubmit={action((answer) => {
                state.answers.push(_.cloneDeep(answer));
                state.index += 1;
              })}
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
    </div>
  );
});

document.querySelectorAll(".situ-quiz-placeholder").forEach((el) => {
  let divEl = el as HTMLDivElement;
  let quiz: Quiz = JSON.parse(divEl.dataset.quiz!);
  let root = ReactDOM.createRoot(el);
  root.render(<QuizView quiz={quiz} />);
});
