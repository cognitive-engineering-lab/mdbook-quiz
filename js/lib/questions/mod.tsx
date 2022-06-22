import React, { useRef } from "react";
import { ShortAnswerQuestion, ShortAnswerView } from "./short-answer";
import { TracingQuestion, TracingView } from "./tracing";

export type Question = ShortAnswerQuestion | TracingQuestion;

let viewMapping = {
  ShortAnswer: ShortAnswerView,
  Tracing: TracingView,
};

export let QuestionView: React.FC<{
  question: Question;
  onSubmit: (answer: any) => void;
}> = ({ question, onSubmit }) => {
  let ref = useRef<any>(null);
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
