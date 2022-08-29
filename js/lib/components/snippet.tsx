import React, { useEffect, useRef } from "react";

let splitHljsOutput = (root: Node): Node[] => {
  let lines: Node[][] = [[]];
  let curLine = () => lines[lines.length - 1];
  root.childNodes.forEach(child => {
    if (child.nodeType == Node.TEXT_NODE) {
      let content = child.textContent!;
      let childLines = content.split("\n");
      if (childLines.length > 1) {
        curLine().push(document.createTextNode(childLines[0]));

        childLines.slice(1, -1).forEach(childLine => {
          lines.push([document.createTextNode(childLine)]);
        });

        lines.push([document.createTextNode(childLines[childLines.length - 1])]);
      } else {
        curLine().push(document.createTextNode(content));
      }
    } else {
      curLine().push(child);
    }
  });

  return lines.map(line => {
    let span = document.createElement("span");
    line.forEach(node => {
      span.appendChild(node);
    });
    return span;
  });
};
export let snippetToNode = (snippet: string, language?: string): HTMLPreElement => {
  let hljs = (window as any).hljs;

  // allow quiz authors to have leading/trailing whitespace
  snippet = snippet.trim();

  // use `[]` to delimit <mark> regions
  snippet = snippet.replace(/`\[/g, "<mark>").replace(/\]`/g, "</mark>");

  let code = document.createElement("code");
  code.className = "language-rust";
  code.innerHTML = snippet;

  // goddamn hack for esbuild-jest
  let f = hljs.highlightBlock;
  f(code, language);

  let pre = document.createElement("pre");
  let lines = splitHljsOutput(code);
  if (lines.length > 1) {
    let wrapped = lines
      .map(line => {
        let codeEl = document.createElement("code");
        codeEl.appendChild(line);
        let numEl = document.createElement("span");
        numEl.className = "line-number";
        return [numEl, codeEl];
      })
      .flat();
    wrapped.forEach(node => {
      pre.appendChild(node);
    });
  } else if (lines.length == 1) {
    pre.appendChild(lines[0]);
  }

  return pre;
};

export let Snippet: React.FC<{ snippet: string }> = ({ snippet }) => {
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current!.appendChild(snippetToNode(snippet));
  }, []);
  return <div ref={ref} />;
};
