import React, { useState } from "react";

import { MarkdownView } from "./markdown";

// TODO: replace this, the bug reporter, and the "why fullscreen?" text with popperjs
export let MoreInfo = ({ markdown }: { markdown: string }) => {
  let [open, setOpen] = useState(false);
  return (
    <span className="info-wrapper">
      {open && (
        <div className="info-popout">
          <MarkdownView markdown={markdown} />
        </div>
      )}
      <span className="info" onClick={() => setOpen(!open)} />
    </span>
  );
};
