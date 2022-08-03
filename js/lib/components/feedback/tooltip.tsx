import { VirtualElement } from "@popperjs/core";
import React, { MouseEventHandler, useState } from "react";
import { usePopper } from "react-popper";

import "../../../css/feedback.scss";

type SelectionTooltipProps = {
  reference: VirtualElement;
  openModal?: () => void;
  text?: string;
};
const SelectionTooltip: React.FC<SelectionTooltipProps> = ({ reference, openModal, text }) => {
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);
  const { styles, attributes } = usePopper(reference, popperElement, {
    placement: "top",
    modifiers: [
      { name: "offset", options: { offset: [0, 8] } },
      { name: "arrow", options: { element: arrowElement } },
    ],
  });

  const handleTooltipClick: MouseEventHandler<HTMLDivElement> = ev => {
    // prevent loss of selected text when user clicks on tooltip
    ev.preventDefault();
  };

  return (
    <div
      ref={setPopperElement}
      className="pop"
      onMouseDown={handleTooltipClick}
      style={styles.popper}
      {...attributes.popper}
    >
      {text ? (
        <div>{text}</div>
      ) : (
        <div className="pop-button" onClick={openModal} title="Provide feedback on this content">
          &#10068;
        </div>
      )}
      <div ref={setArrowElement} className="pop-arrow" style={styles.arrow} />
    </div>
  );
};

export default SelectionTooltip;
