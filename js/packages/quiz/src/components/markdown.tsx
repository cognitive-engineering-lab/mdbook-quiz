import React, { useEffect, useRef } from "react";
import Showdown, { ShowdownExtension } from "react-showdown";

import { SnippetOptions, renderIde, snippetToNode } from "./snippet";

let highlightExtension = (
  options?: Partial<SnippetOptions>
): ShowdownExtension => ({
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

      let newNode = snippetToNode({
        ...(options || {}),
        snippet: node.textContent!,
        language,
      });
      let pre = node.parentNode as HTMLPreElement;
      pre.replaceWith(newNode);
    });
    return document.body.innerHTML;
  },
});

export let MarkdownView: React.FC<{
  markdown: string;
  snippetOptions?: Partial<SnippetOptions>;
}> = ({ markdown, snippetOptions }) => {
  let ref = useRef<HTMLDivElement>(null);
  useEffect(() => renderIde(ref.current!, snippetOptions), [markdown]);

  return (
    <div ref={ref}>
      <Showdown
        markdown={markdown}
        extensions={[highlightExtension(snippetOptions)]}
      />
    </div>
  );
};
