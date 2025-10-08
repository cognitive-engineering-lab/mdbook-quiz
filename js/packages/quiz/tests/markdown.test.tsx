import hljs from "highlight.js";
import { describe, it } from "vitest";

import { snippetToNode } from "../src/lib";

describe("Snippet", () => {
  it("renders line numbers", async () => {
    snippetToNode({
      snippet: "Hello world",
      lineNumbers: true,
      syntaxHighlighter: hljs.highlightElement
    });
  });
});
