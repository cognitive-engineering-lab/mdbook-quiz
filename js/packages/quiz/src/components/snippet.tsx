import * as rustEditor from "@wcrichto/rust-editor";
import type { monaco } from "@wcrichto/rust-editor";
import React, { useContext, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { QuizConfigContext } from "./quiz";

export type SyntaxHighlighter = (code: HTMLElement) => void;

export interface SnippetOptions {
  snippet: string;
  lineNumbers?: boolean;
  language?: string;
  syntaxHighlighter?: SyntaxHighlighter;
}

export let snippetToNode = ({
  snippet,
  language,
  lineNumbers,
  syntaxHighlighter
}: SnippetOptions): HTMLPreElement => {
  // allow quiz authors to have leading/trailing whitespace
  snippet = snippet.trim();

  // escape HTML entities
  snippet = snippet.replace(
    /[<>]/g,
    t => ({ "<": "&lt;", ">": "&gt;" })[t] || t
  );

  // use `[]` to delimit <mark> regions
  snippet = snippet.replace(/`\[/g, "<mark>").replace(/\]`/g, "</mark>");

  // Insert line numbers if requested
  if (lineNumbers) {
    let lines = snippet.split("\n");
    snippet = lines
      .map(line => `<span class="line-number"></span><code>${line}</code>`)
      .join("\n");
  } else {
    snippet = `<code>${snippet}</code>`;
  }

  let code = document.createElement("code");
  code.className = `language-${language || "rust"}`;
  code.innerHTML = snippet;

  if (syntaxHighlighter) syntaxHighlighter(code);

  // HACK: some highlighters like the C++ one seem to inject random spans
  // outside of the containing <code> elements. As a workaround, we find
  // and remove those spans.
  for (let child of code.children) {
    if (child.tagName === "SPAN" && child.className !== "line-number")
      child.remove();
  }

  let pre = document.createElement("pre");
  pre.innerHTML = code.innerHTML;
  if (lineNumbers) pre.classList.add("line-numbers");

  return pre;
};

let extractMarks = (inp: string): { s: string; marks: [number, number][] } => {
  let outp = [];
  let marks: [number, number][] = [];
  let inpIndex = 0;
  let outpIndex = 0;
  let open: number | undefined;
  while (inpIndex < inp.length) {
    let cur = inp.slice(inpIndex, inpIndex + 2);
    if (cur === "`[") {
      open = outpIndex;
      inpIndex += 2;
    } else if (cur === "]`") {
      marks.push([open!, outpIndex]);
      open = undefined;
      inpIndex += 2;
    } else {
      outp.push(inp.at(inpIndex));
      inpIndex += 1;
      outpIndex += 1;
    }
  }
  return { s: outp.join(""), marks };
};

export let renderIde = (
  container: HTMLElement,
  options?: Partial<SnippetOptions>
): (() => void) | undefined => {
  if (!rustEditor.Editor) return;

  let ideNodes = Array.from(container.querySelectorAll("code.ide"));
  let roots = ideNodes.map(node => {
    let { s, marks } = extractMarks(node.textContent!.trim());

    let darkMode = ["navy", "coal", "ayu"].some(theme =>
      document.documentElement.classList.contains(theme)
    );

    let newEl = document.createElement("div");
    let root = ReactDOM.createRoot(newEl);
    let gutterConfig: Partial<monaco.editor.IStandaloneEditorConstructionOptions> =
      options?.lineNumbers
        ? {
            lineNumbersMinChars: 2
          }
        : {
            lineNumbers: "off",
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0
          };
    root.render(
      <rustEditor.Editor
        contents={s}
        highlights={marks}
        disabled={true}
        exactHeight={true}
        editorOptions={{
          guides: { indentation: false },
          renderLineHighlight: "none",
          theme: darkMode ? "vs-dark" : "vs",
          glyphMargin: false,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          ...gutterConfig
        }}
      />
    );
    (node.parentNode! as HTMLElement).replaceWith(newEl);
    return root;
  });

  // setTimeout avoids false-positive warning from React about unmounting
  // while a render is going on. see:
  // https://stackoverflow.com/questions/73459382/react-18-async-way-to-unmount-root
  return () => setTimeout(() => roots.forEach(root => root.unmount()));
};

export let Snippet: React.FC<SnippetOptions> = options => {
  let config = useContext(QuizConfigContext);
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current!.appendChild(
      snippetToNode({ ...options, syntaxHighlighter: config.syntaxHighlighter })
    );
  }, []);
  return <div ref={ref} />;
};
