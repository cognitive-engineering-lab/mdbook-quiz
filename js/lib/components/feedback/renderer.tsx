import { VirtualElement } from "@popperjs/core";
import React from "react";
import { useEffect, useState } from "react";
import Highlighter from "web-highlighter";

import SelectionTooltip from "./tooltip";

type FeedbackRendererProps = { highlighter: Highlighter };
const FeedbackRenderer: React.FC<FeedbackRendererProps> = ({ highlighter }) => {
  // id of feedback highlight currently hovered over
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    // update state on hover changes
    highlighter.on(Highlighter.event.HOVER, ({ id }) => setHovered(id));
    highlighter.on(Highlighter.event.HOVER_OUT, () => setHovered(null));
  }, []);

  if (hovered) {
    // If hovering over existing highlight, show feedback in tooltip
    let el = highlighter.getDoms(hovered);
    let feedback = highlighter.cache.get(hovered).extra as string;

    const reference: VirtualElement = {
      getBoundingClientRect: el[0].getBoundingClientRect.bind(el[0]),
    };

    return <SelectionTooltip reference={reference} text={feedback} />;
  }

  return null;
};

export default FeedbackRenderer;
