import React from "react";

let splitHljsOutput = (html: string): Node[] => {
  let parser = new DOMParser();
  let dom = parser.parseFromString(html, "text/html");
  let lines: Node[][] = [[]];
  let curLine = () => lines[lines.length - 1];
  dom.body.childNodes.forEach(child => {
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

export let snippetToHtml = (snippet: string, language?: string): string => {
  let hljs = (window as any).hljs;
  snippet = snippet.trim(); // allow quiz authors to have leading/trailing whitespace
  let highlighted: string = hljs.highlight(language || "rust", snippet).value;
  let lines = splitHljsOutput(highlighted);

  let pre = document.createElement("pre");
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

  return pre.outerHTML;
};

export let Snippet: React.FC<{ snippet: string }> = ({ snippet }) => {
  let html = snippetToHtml(snippet);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
