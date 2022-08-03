import React from "react";
import * as ReactDOM from "react-dom/client";
import Highlighter from "web-highlighter";

import FeedbackRenderer from "../components/feedback/renderer";
import SelectionRenderer from "../components/feedback/selection";

export const HIGHLIGHT_STORAGE_KEY = "mdbook-quiz:highlights";

let initFeedback = () => {
  let highlighter = new Highlighter();
  let stored = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
  let stored_parsed = JSON.parse(stored || "[]");

  let div = document.createElement("div");
  let page = document.querySelector(".page")!;
  page.appendChild(div);
  let root = ReactDOM.createRoot(div);

  root.render(
    <>
      {/* render tooltip over existing feedback */}
      <FeedbackRenderer highlighter={highlighter} />

      {/* render tooltip over user's current selection */}
      <SelectionRenderer highlighter={highlighter} stored={stored_parsed as any[]} />
    </>
  );
};

initFeedback();
