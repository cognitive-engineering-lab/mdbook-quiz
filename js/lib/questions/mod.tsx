import React, { useRef } from "react";
import { ShortAnswer, ShortAnswerMethods } from "./short-answer";
import { Tracing, TracingMethods } from "./tracing";
import { QuestionMethods } from "./base";
import classNames from "classnames";
import MarkdownView from "react-showdown";
import _ from "lodash";

export type Question = ShortAnswer | Tracing;

let methodMapping = {
  ShortAnswer: ShortAnswerMethods,
  Tracing: TracingMethods,
};

export let getQuestionMethods = (
  type: Question["type"]
): QuestionMethods<any, any> => methodMapping[type];

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
  let methods = getQuestionMethods(question.type);
  if (!methods) {
    return (
      <div>
        QUIZ FORMAT ERROR: unknown question type <code>{question.type}</code>
      </div>
    );
  }

  let questionClass = questionNameToCssClass(question.type);

  let submit = () => {
    let form = ref.current!;
    let data = new FormData(form);
    let answer = methods.getAnswerFromDOM(data, form);
    onSubmit(answer);
  };

  return (
    <div className={classNames("question", questionClass)}>
      <div className="prompt">
        <h4>Prompt</h4>
        <methods.PromptView prompt={question.prompt} />
      </div>
      <form className="response" ref={ref}>
        <h4>Response</h4>
        <methods.ResponseView submit={submit} />
      </form>
      <button onClick={submit}>Submit</button>
    </div>
  );
};

export let AnswerView: React.FC<{
  question: Question;
  userAnswer: Question["answer"];
}> = ({ question, userAnswer }) => {
  let methods = getQuestionMethods(question.type);
  let questionClass = questionNameToCssClass(question.type);

  let comparator = methods.compareAnswers || _.isEqual;
  let isCorrect = comparator(question.answer, userAnswer);

  return (
    <div className={classNames("answer", questionClass)}>
      <div className="prompt">
        <methods.PromptView prompt={question.prompt} />
      </div>
      <div className="answer-row">
        <div className={isCorrect ? "correct" : "incorrect"}>
          <div className="answer-header">You answered:</div>
          <methods.AnswerView answer={userAnswer} />
        </div>
        {!isCorrect ? (
          <div className="correct">
            <div className="answer-header">The correct answer is:</div>
            <methods.AnswerView answer={question.answer} />
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
