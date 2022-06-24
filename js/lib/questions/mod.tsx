import React, { useRef } from "react";
import { ShortAnswer, ShortAnswerMethods } from "./short-answer";
import { Tracing, TracingMethods } from "./tracing";
import { defaultComparator, QuestionMethods } from "./types";
import classNames from "classnames";
import MarkdownView from "react-showdown";
import _ from "lodash";
import { RegisterOptions, useForm } from "react-hook-form";
import { MultipleChoice, MultipleChoiceMethods } from "./multiple-choice";

export type Question = ShortAnswer | Tracing | MultipleChoice;

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

export let QuestionView: React.FC<{
  question: Question;
  index: number;
  onSubmit: (answer: any) => void;
}> = ({ question, index, onSubmit }) => {
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

  let submit = formValidators.handleSubmit((data) => {
    let answer = methods.getAnswerFromDOM
      ? methods.getAnswerFromDOM(data, ref.current!)
      : data;
    onSubmit(answer);
  });

  return (
    <div className={classNames("question", questionClass)}>
      <div className="prompt">
        <h4>Question {index}</h4>
        <methods.PromptView prompt={question.prompt} />
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
  question: Question;
  index: number;
  userAnswer: Question["answer"];
}> = ({ question, index, userAnswer }) => {
  let methods = getQuestionMethods(question.type);
  let questionClass = questionNameToCssClass(question.type);

  let comparator = methods.compareAnswers || defaultComparator;
  let isCorrect = comparator(question.answer, userAnswer);

  return (
    <div className={classNames("answer", questionClass)}>
      <div className="prompt">
        <h4>Question {index}</h4>
        <methods.PromptView prompt={question.prompt} />
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
        {!isCorrect ? (
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
      {!isCorrect && question.context ? (
        <div className="context">
          <MarkdownView markdown={`**Context**: ` + question.context} />
        </div>
      ) : null}
    </div>
  );
};
