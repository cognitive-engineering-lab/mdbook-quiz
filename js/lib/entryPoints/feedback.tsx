import React from "react";
import * as ReactDOM from "react-dom/client";
import Highlighter from "web-highlighter";

import SelectionRenderer from "../components/feedback/selection";

export const HIGHLIGHT_STORAGE_KEY = "mdbook-quiz:highlights";

let initFeedback = () => {
  let highlighter = new Highlighter();
  let stored = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
  if (stored !== null) {
    stored = JSON.parse(stored);
  }

  let div = document.createElement("div");
  let page = document.querySelector(".page")!;
  page.appendChild(div);
  let root = ReactDOM.createRoot(div);
  root.render(<SelectionRenderer highlighter={highlighter} stored={stored as unknown as any[]} />);
};

initFeedback();
