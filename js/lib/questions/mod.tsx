import classNames from "classnames";
import _ from "lodash";
import React, { useMemo, useRef, useState } from "react";
import { RegisterOptions, useForm } from "react-hook-form";

import { MarkdownView } from "../components/markdown";
import { MultipleChoice, MultipleChoiceMethods } from "./multiple-choice";
import { ShortAnswer, ShortAnswerMethods } from "./short-answer";
import { Tracing, TracingMethods } from "./tracing";
import { QuestionMethods } from "./types";

export type Question = ShortAnswer | Tracing | MultipleChoice;

let methodMapping = {
  ShortAnswer: ShortAnswerMethods,
  Tracing: TracingMethods,
  MultipleChoice: MultipleChoiceMethods,
};

export let getQuestionMethods = (type: Question["type"]): QuestionMethods<any, any> =>
  methodMapping[type];

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

let BugReporter = ({ quizName, question }: { quizName: string; question: number }) => {
  let [show, setShow] = useState(false);
  let onSubmit: React.FormEventHandler<HTMLFormElement> = event => {
    let data = new FormData(event.target as any);
    let feedback = data.get("feedback")!.toString();
    window.telemetry!.log("bug", {
      quizName,
      question,
      feedback,
    });
    event.preventDefault();
    setShow(false);
  };
  return (
    <div className="bug-report">
      <button title="Report a bug in this question" onClick={() => setShow(!show)}>
        🐞
      </button>
      {show ? (
        <div className="reporter">
          <h3>Report a bug</h3>
          <p>
            If you found an issue in this question (e.g. a typo or an incorrect answer), please
            describe the issue and report it:
          </p>
          <form onSubmit={onSubmit}>
            <textarea name="feedback" aria-label="Bug feedback"></textarea>
            <input type="submit" aria-label="Submit bug feedback" />
          </form>
        </div>
      ) : null}
    </div>
  );
};

export interface TaggedAnswer {
  answer: any;
  correct: boolean;
  start: number;
  end: number;
}

let now = () => new Date().getTime();

export let QuestionView: React.FC<{
  quizName: string;
  question: Question;
  index: number;
  onSubmit: (answer: TaggedAnswer) => void;
}> = ({ quizName, question, index, onSubmit }) => {
  let start = useMemo(now, [quizName, question, index]);
  let ref = useRef<HTMLFormElement>(null);
  let methods = getQuestionMethods(question.type);
  if (!methods) {
    return (
      <div>
        QUIZ FORMAT ERROR: unknown question type <code>{question.type}</code>
      </div>
    );
  }

  let formValidators = useForm();
  let required = (name: string, options?: RegisterOptions) => {
    let attrs = formValidators.register(name, { ...options, required: true });
    let className = classNames({
      error: formValidators.formState.errors[name],
    });
    return { ...attrs, className };
  };

  let questionClass = questionNameToCssClass(question.type);

  let submit = formValidators.handleSubmit(data => {
    let answer = methods.getAnswerFromDOM ? methods.getAnswerFromDOM(data, ref.current!) : data;
    let comparator = methods.compareAnswers || _.isEqual;
    let correct = comparator(question.answer, answer);
    onSubmit({ answer, correct, start, end: now() });
  });

  return (
    <div className={classNames("question", questionClass)}>
      <div className="prompt">
        <h4>Question {index}</h4>
        <methods.PromptView prompt={question.prompt} />
        {window.telemetry ? <BugReporter quizName={quizName} question={index} /> : null}
      </div>
      <form className="response" ref={ref} onSubmit={submit}>
        <h4>Response</h4>
        <methods.ResponseView
          prompt={question.prompt}
          submit={submit}
          formValidators={{ ...formValidators, required }}
        />
        <input type="submit" />
      </form>
    </div>
  );
};

export let AnswerView: React.FC<{
  quizName: string;
  question: Question;
  index: number;
  userAnswer: Question["answer"];
  correct: boolean;
  showCorrect: boolean;
}> = ({ quizName, question, index, userAnswer, correct, showCorrect }) => {
  let methods = getQuestionMethods(question.type);
  let questionClass = questionNameToCssClass(question.type);

  return (
    <div className={classNames("answer", questionClass)}>
      <div className="prompt">
        <h4>Question {index}</h4>
        <methods.PromptView prompt={question.prompt} />
        {window.telemetry ? <BugReporter quizName={quizName} question={index} /> : null}
      </div>
      <div className="answer-row">
        <div>
          <div className="answer-header">You answered:</div>
          <div>
            <methods.AnswerView
              answer={userAnswer}
              baseline={question.answer}
              prompt={question.prompt}
            />
          </div>
        </div>
        {showCorrect && !correct ? (
          <div>
            <div className="answer-header">The correct answer is:</div>
            <div>
              <methods.AnswerView
                answer={question.answer}
                baseline={question.answer}
                prompt={question.prompt}
              />
            </div>
          </div>
        ) : null}
      </div>
      {showCorrect && question.context ? (
        <div className="context">
          <MarkdownView markdown={`**Context**:\n` + question.context} />
        </div>
      ) : null}
    </div>
  );
};
