import { VirtualElement } from "@popperjs/core";
import React, { useCallback, useEffect, useState } from "react";
import Highlighter from "web-highlighter";

import { HIGHLIGHT_STORAGE_KEY } from "../../entryPoints/feedback";
import FeedbackModal from "./modal";
import SelectionTooltip from "./tooltip";

type SelectionRendererProps = { highlighter: Highlighter; stored?: any[] };
let SelectionRenderer: React.FC<SelectionRendererProps> = ({ highlighter, stored }) => {
  // id of feedback highlight currently being hovered over
  const [hovered, setHovered] = useState<string | null>(null);

  // current highlighted range of text
  const [currRange, setCurrRange] = useState<Range | null>(null);

  // whether feedback modal is open
  const [modalOpen, setModalOpen] = useState(false);

  // update selected range when selection changes
  // wrapped in useCallback to retain a stable reference to the callback
  // so addEventListener and removeEventListener use the same function
  const handleSelection = useCallback(() => {
    // get current selection (falsy value if no selection)
    let selection = document.getSelection();
    let range =
      selection && !selection.isCollapsed && selection.rangeCount && selection.getRangeAt(0);

    setCurrRange(range || null);
  }, []);

  useEffect(() => {
    // load highlights from local storage
    stored?.map(s => highlighter.fromStore(s.startMeta, s.endMeta, s.id, s.text, s.extra));

    // store new highlights in localStorage when created
    highlighter.on(Highlighter.event.CREATE, ({ sources }) => {
      let stored_str = localStorage.getItem(HIGHLIGHT_STORAGE_KEY);
      let stored_highlights = JSON.parse(stored_str || "[]");
      stored_highlights.push(...sources);

      localStorage.setItem(HIGHLIGHT_STORAGE_KEY, JSON.stringify(stored_highlights));
    });

    // update state on hover changes
    highlighter.on(Highlighter.event.HOVER, ({ id }) => setHovered(id));
    highlighter.on(Highlighter.event.HOVER_OUT, () => setHovered(null));
  }, []);

  useEffect(() => {
    // handle selection events only when modal closed
    if (!modalOpen) {
      document.addEventListener("selectionchange", handleSelection);
    } else {
      document.removeEventListener("selectionchange", handleSelection);
    }
  }, [modalOpen]);

  // Remove modal and tooltip when closing modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrRange(null);
  };

  if (hovered) {
    // If hovering over existing highlight, show feedback in tooltip
    let el = highlighter.getDoms(hovered);
    let feedback = highlighter.cache.get(hovered).extra as string;

    const reference: VirtualElement = {
      getBoundingClientRect: el[0].getBoundingClientRect.bind(el[0]),
    };

    return <SelectionTooltip reference={reference} text={feedback} />;
  }

  if (currRange) {
    if (modalOpen) {
      // If tooltip feedback icon pressed, render modal
      return (
        <FeedbackModal range={currRange} highlighter={highlighter} closeModal={handleCloseModal} />
      );
    } else {
      // If modal not open, show tooltip over selected text
      const reference: VirtualElement = {
        getBoundingClientRect: currRange.getBoundingClientRect.bind(currRange),
      };

      return <SelectionTooltip reference={reference} openModal={() => setModalOpen(true)} />;
    }
  }

  return null;
};

export default SelectionRenderer;
