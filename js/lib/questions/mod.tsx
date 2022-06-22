import React, { useRef } from "react";
import { ShortAnswer, ShortAnswerView } from "./short-answer";
import { Tracing, TracingView } from "./tracing";
import { QuestionViews } from "./base";
import classNames from "classnames";
import MarkdownView from "react-showdown";
import _ from "lodash";

export type Question = ShortAnswer | Tracing;

let viewMapping = {
  ShortAnswer: ShortAnswerView,
  Tracing: TracingView,
};

let questionNameToCssClass = (name: string) => {
  let output = [];
  for (let i = 0; i < name.length; ++i) {
    if (i > 0 && name[i].match(/[A-Z]/)) {
      output.push("-");
    }

    output.push(name[i].toLowerCase());
  }
  return output.join("");
};

export let QuestionView: React.FC<{
  question: Question;
  onSubmit: (answer: any) => void;
}> = ({ question, onSubmit }) => {
  let ref = useRef<HTMLFormElement>(null);
  let questionViews: QuestionViews<any, any> = viewMapping[question.type];
  if (!questionViews) {
    return (
      <div>
        QUIZ FORMAT ERROR: unknown question type <code>{question.type}</code>
      </div>
    );
  }

  let questionClass = questionNameToCssClass(question.type);

  let onClick = () => {
    let form = ref.current!;
    let data = new FormData(form);
    let answer = questionViews.getAnswerFromDOM(data, form);
    onSubmit(answer);
  };

  return (
    <div className={classNames("question", questionClass)}>
      <div className="prompt">
        <h4>Prompt</h4>
        <questionViews.PromptView prompt={question.prompt} />
      </div>
      <form className="response" ref={ref}>
        <h4>Response</h4>
        <questionViews.ResponseView />
      </form>
      <button onClick={onClick}>Submit</button>
    </div>
  );
};

export let AnswerView: React.FC<{
  question: Question;
  userAnswer: Question["answer"];
}> = ({ question, userAnswer }) => {
  let questionViews: QuestionViews<any, any> = viewMapping[question.type]!;
  let questionClass = questionNameToCssClass(question.type);

  let comparator = questionViews.compareAnswers || _.isEqual;
  let isCorrect = comparator(question.answer, userAnswer);

  return (
    <div className={classNames("answer", questionClass)}>
      <div className="prompt">
        <h4>Prompt</h4>
        <questionViews.PromptView prompt={question.prompt} />
      </div>
      <div className="answer-row">
        <div className={isCorrect ? "correct" : "incorrect"}>
          <strong>You answered:</strong>
          <questionViews.AnswerView answer={userAnswer} />
        </div>
        {!isCorrect ? (
          <div className="correct">
            <strong>The correct answer is:</strong>
            <questionViews.AnswerView answer={question.answer} />
          </div>
        ) : null}
      </div>
      {!isCorrect && question.context ? (
        <div className="context">
          <MarkdownView markdown={question.context} />
        </div>
      ) : null}
    </div>
  );
};
