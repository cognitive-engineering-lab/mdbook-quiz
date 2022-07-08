import axios from "axios";
import React from "react";

import { Quiz } from "./components/quiz";
import { TaggedAnswer } from "./questions/mod";

export interface BaseLog {
  user?: string;
  quizName: string;
  host: string;
  timestamp: number;
  quizHash: string;
  commitHash?: string;
}

export type AnswersLog = BaseLog & {
  answers: TaggedAnswer[];
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
    private quizHash: string,
    private commitHash?: string,
    private user?: string
  ) {}

  private log<T extends {}>(log: T, path: string) {
    let host = window.location.host;
    if (host == "localhost" && !this.endpoint.includes("localhost")) {
      return;
    }

    let baseLog: BaseLog = {
      timestamp: new Date().getTime(),
      host,
      quizName: this.quizName,
      quizHash: this.quizHash,
      user: this.user,
      commitHash: this.commitHash,
    };
    axios.post(this.endpoint + "/" + path, { ...baseLog, ...log });
  }

  logAnswers(answers: TaggedAnswer[]) {
    this.log({ answers }, "answers");
  }

  logBug(question: number, feedback: string) {
    this.log({ question, feedback }, "bug");
  }
}

export let LoggerContext = React.createContext<Logger | null>(null);
