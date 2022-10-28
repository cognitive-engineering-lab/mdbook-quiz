import hljs from "highlight.js";
import React, { useEffect, useRef } from "react";

export let snippetToNode = (snippet: string, language?: string): HTMLPreElement => {
  // allow quiz authors to have leading/trailing whitespace
  snippet = snippet.trim();

  // escape HTML entities
  snippet = snippet.replace(/[<>]/g, t => ({ "<": "&lt;", ">": "&gt;" }[t] || t));

  // use `[]` to delimit <mark> regions
  snippet = snippet.replace(/`\[/g, "<mark>").replace(/\]`/g, "</mark>");

  // Insert line numbers for multi-line snippets
  if (snippet.includes("\n")) {
    let lines = snippet.split("\n");
    snippet = lines.map(line => `<span class="line-number"></span><code>${line}</code>`).join("\n");
  } else {
    snippet = `<code>${snippet}</code>`;
  }

  let code = document.createElement("code");
  code.className = `language-${language || "rust"}`;
  code.innerHTML = snippet;

  // goddamn hack for esbuild-jest
  let f = hljs.highlightBlock;
  f(code);

  let pre = document.createElement("pre");
  pre.innerHTML = code.innerHTML;

  return pre;
};

export let Snippet: React.FC<{ snippet: string }> = ({ snippet }) => {
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current!.appendChild(snippetToNode(snippet));
  }, []);
  return <div ref={ref} />;
};
