import { VirtualElement } from "@popperjs/core";
import React, { MouseEventHandler, PropsWithChildren, useEffect, useState } from "react";
import { usePopper } from "react-popper";

import "../../../css/feedback.scss";

type FeedbackTooltipProps = PropsWithChildren<{
  reference: VirtualElement;
  onHoverChange?: (isHovered: boolean) => void;
}>;
const FeedbackTooltip: React.FC<FeedbackTooltipProps> = ({
  reference,
  onHoverChange,
  children,
}) => {
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);
  const { styles, attributes } = usePopper(reference, popperElement, {
    placement: "top",
    modifiers: [{ name: "arrow", options: { element: arrowElement } }],
  });

  useEffect(() => {
    if (onHoverChange && popperElement) {
      popperElement.addEventListener("mouseenter", () => onHoverChange(true));
      popperElement.addEventListener("mouseleave", () => onHoverChange(false));
    }
  }, [popperElement]);

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
      {children}
      <div ref={setArrowElement} className="pop-arrow" style={styles.arrow} />
    </div>
  );
};

export default FeedbackTooltip;
