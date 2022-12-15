import * as rustEditor from "@wcrichto/rust-editor";
import type { monaco } from "@wcrichto/rust-editor";
//@ts-ignore
import hljs from "highlight.js/lib/core";
//@ts-ignore
import rust from "highlight.js/lib/languages/rust";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// This reduces bundle size by not including a bunch of extra languages
hljs.registerLanguage("rust", rust);

export interface SnippetOptions {
  snippet: string;
  lineNumbers?: boolean;
  language?: string;
}

export let snippetToNode = ({
  snippet,
  language,
  lineNumbers,
}: SnippetOptions): HTMLPreElement => {
  // allow quiz authors to have leading/trailing whitespace
  snippet = snippet.trim();

  // escape HTML entities
  snippet = snippet.replace(
    /[<>]/g,
    t => ({ "<": "&lt;", ">": "&gt;" }[t] || t)
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

  // goddamn hack for esbuild-jest
  let f = hljs.highlightBlock;
  f(code);

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
    if (cur == "`[") {
      open = outpIndex;
      inpIndex += 2;
    } else if (cur == "]`") {
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
      options && options.lineNumbers
        ? {
            lineNumbersMinChars: 2,
          }
        : {
            lineNumbers: "off",
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
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
          ...gutterConfig,
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
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current!.appendChild(snippetToNode(options));
  }, []);
  return <div ref={ref} />;
};
