import { Question } from "@wcrichto/quiz-schema";
import classNames from "classnames";
import _ from "lodash";
import React, { useId, useMemo, useRef, useState } from "react";
import { RegisterOptions, useForm } from "react-hook-form";

import { MarkdownView } from "../components/markdown";
import { MoreInfo } from "../components/more-info";
import { useCaptureMdbookShortcuts } from "../lib";
import { MultipleChoiceMethods } from "./multiple-choice";
import { ShortAnswerMethods } from "./short-answer";
import { TracingMethods } from "./tracing";
import { QuestionMethods } from "./types";

export { MultipleChoiceMethods } from "./multiple-choice";
export { ShortAnswerMethods } from "./short-answer";
export { TracingMethods } from "./tracing";

let methodMapping = {
  ShortAnswer: ShortAnswerMethods,
  Tracing: TracingMethods,
  MultipleChoice: MultipleChoiceMethods,
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

let BugReporter = ({
  quizName,
  question,
}: {
  quizName: string;
  question: number;
}) => {
  let [show, setShow] = useState(false);

  // Disable mdbook shortcuts if the bug reporter is opened and we're not
  // fullscreen
  useCaptureMdbookShortcuts(show);

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
      <button
        title="Report a bug in this question"
        onClick={() => setShow(!show)}
      >
        🐞
      </button>
      {show ? (
        <div className="reporter">
          <button className="close" onClick={() => setShow(false)}>
            ✕
          </button>
          <h3>Report a bug</h3>
          <p>
            If you found an issue in this question (e.g. a typo or an incorrect
            answer), please describe the issue and report it:
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
  explanation?: string;
}

let now = () => new Date().getTime();

const EXPLANATION_HELP = `
Normally, we only observe *whether* readers get a question correct or incorrect. 
This explanation helps us understand *why* a reader answers a particular way, so 
we can better improve the surrounding text.
`.trim();

export let QuestionView: React.FC<{
  quizName: string;
  question: Question;
  index: number;
  attempt: number;
  questionState?: any;
  onSubmit: (answer: TaggedAnswer) => void;
}> = ({ quizName, question, index, attempt, questionState, onSubmit }) => {
  let start = useMemo(now, [quizName, question, index]);
  let ref = useRef<HTMLFormElement>(null);
  let [showExplanation, setShowExplanation] = useState(false);
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
    let answer = methods.getAnswerFromDOM
      ? methods.getAnswerFromDOM(data, ref.current!)
      : data;
    let comparator = methods.compareAnswers || _.isEqual;
    let correct = comparator(question.answer, answer);
    onSubmit({
      answer,
      correct,
      start,
      end: now(),
      explanation: data.explanation,
    });
  });

  let shouldPrompt = question.promptExplanation && attempt == 0;
  let explanationId = useId();

  return (
    <div className={classNames("question", questionClass)}>
      <div className="prompt">
        <h4>Question {index}</h4>
        <methods.PromptView prompt={question.prompt} />
        {window.telemetry ? (
          <BugReporter quizName={quizName} question={index} />
        ) : null}
      </div>
      <form className="response" ref={ref} onSubmit={submit}>
        <h4>Response</h4>
        <fieldset disabled={showExplanation}>
          <methods.ResponseView
            key={`${quizName}-question${index}`}
            prompt={question.prompt}
            answer={question.answer}
            submit={submit}
            state={questionState}
            formValidators={{ ...formValidators, required }}
          />
        </fieldset>
        {showExplanation ? (
          <>
            <p>
              <br />
              <label htmlFor={explanationId}>
                In 1-2 sentences, please explain why you picked this answer.
                &nbsp;&nbsp;
                <MoreInfo markdown={EXPLANATION_HELP} />
              </label>
            </p>
            <textarea
              id={explanationId}
              title="Explanation"
              {...required("explanation")}
            ></textarea>
          </>
        ) : null}
        {shouldPrompt && !showExplanation ? (
          <button onClick={() => setShowExplanation(true)}>Submit</button>
        ) : (
          <input type="submit" />
        )}
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
        {window.telemetry ? (
          <BugReporter quizName={quizName} question={index} />
        ) : null}
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
