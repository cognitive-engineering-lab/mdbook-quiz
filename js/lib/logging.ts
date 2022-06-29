import axios from "axios";
import React from "react";

import { Quiz } from "./components/quiz";
import { getQuestionMethods } from "./questions/mod";
import { defaultComparator } from "./questions/types";

export interface BaseLog {
  user?: string;
  quizName: string;
  host: string;
  timestamp: number;
}

export type AnswersLog = BaseLog & {
  answers: any[];
};

export type BugLog = BaseLog & {
  question: number;
  feedback: string;
};

export class Logger {
  constructor(
    private endpoint: string,
    private quizName: string,
    private quiz: Quiz,
    private user?: string
  ) {}

  private log<T extends {}>(log: T, path: string) {
    let fullLog = {
      timestamp: new Date().getTime(),
      host: window.location.host,
      quizName: this.quizName,
      user: this.user,
      ...log,
    };
    axios.post(this.endpoint + "/" + path, fullLog);
  }

  logAnswers(answers: any[]) {
    answers = answers.map((answer, i) => {
      // Save whether the answer was correct into the log
      let question = this.quiz.questions[i];
      let methods = getQuestionMethods(question.type);
      let comparator = methods.compareAnswers || defaultComparator;
      let correct = comparator(answer, question.answer);
      return { ...answer, correct };
    });
    this.log({ answers }, "answers");
  }

  logBug(question: number, feedback: string) {
    this.log({ question, feedback }, "bug");
  }
}

export let LoggerContext = React.createContext<Logger | null>(null);
