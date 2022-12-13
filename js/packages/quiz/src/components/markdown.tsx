import * as rustEditor from "@wcrichto/rust-editor";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import Showdown, { ShowdownExtension } from "react-showdown";

import { snippetToNode } from "./snippet";

let highlightExtension: ShowdownExtension = {
  type: "output",
  filter(text) {
    let parser = new DOMParser();
    let document = parser.parseFromString(text, "text/html");
    let snippets = document.querySelectorAll("pre > code");
    snippets.forEach(node => {
      if (node.classList.contains("ide")) return;

      let language = undefined;
      node.classList.forEach(cls => {
        let prefix = "language-";
        if (cls.startsWith(prefix)) {
          language = cls.slice(prefix.length);
        }
      });

      let newNode = snippetToNode(node.textContent!, language);
      let pre = node.parentNode as HTMLPreElement;
      pre.replaceWith(newNode);
    });
    return document.body.innerHTML;
  },
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

export let MarkdownView: React.FC<{ markdown: string }> = ({ markdown }) => {
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rustEditor.Editor) return;

    let ideNodes = Array.from(ref.current!.querySelectorAll("code.ide"));
    let roots = ideNodes.map(node => {
      let { s, marks } = extractMarks(node.textContent!.trim());

      let darkMode = ["navy", "coal", "ayu"].some(theme =>
        document.documentElement.classList.contains(theme)
      );

      console.log("Rendering an IDE...");
      let newEl = document.createElement("div");
      let root = ReactDOM.createRoot(newEl);
      root.render(
        <rustEditor.Editor
          contents={s}
          highlights={marks}
          disabled={true}
          exactHeight={true}
          editorOptions={{
            guides: { indentation: false },
            lineNumbers: "off",
            renderLineHighlight: "none",
            theme: darkMode ? "vs-dark" : "vs",
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
          }}
        />
      );
      (node.parentNode! as HTMLElement).replaceWith(newEl);
      return root;
    });
    return () => roots.forEach(root => root.unmount());
  });

  return (
    <div ref={ref}>
      <Showdown markdown={markdown} extensions={[highlightExtension]} />
    </div>
  );
};
