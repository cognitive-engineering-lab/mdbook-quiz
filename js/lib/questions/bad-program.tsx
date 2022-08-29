import _ from "lodash";
import React, { useEffect, useState } from "react";

import { MarkdownView } from "../components/markdown";
import { Snippet } from "../components/snippet";
import { QuestionFields, QuestionMethods } from "./types";

export interface BadProgramPrompt {
  /** The contents of the program to trace */
  program: string;
}

export interface BadProgramAnswer {
  problem: string;

  counterexample: string;

  fix: string;
}

export type BadProgram = QuestionFields<"BadProgram", BadProgramPrompt, BadProgramAnswer>;

export let BadProgramMethods: QuestionMethods<BadProgramPrompt, BadProgramAnswer> = {
  PromptView: ({ prompt }) => (
    <>
      <MarkdownView
        markdown={`
The code below is rejected by the Rust compiler.

1. Explain why the compiler rejects this code.
2. Assume the compiler allowed the code to compile. Write a program that uses this code and could possibly cause either memory unsafety or a data race.
3. Fix the problematic code while preserving its intended goals.
`}
      />
      <Snippet snippet={prompt.program} />
    </>
  ),

  ResponseView: ({
    prompt,
    formValidators: {
      required,
      formState: { errors },
    },
  }) => {
    // TODO 
    return null;
  },

  getAnswerFromDOM(data) {
    // TODO
    return { problem: "", counterexample: "", fix: "'" };
  },

  AnswerView: ({ answer, baseline }) => {
    return null;
  },
};
