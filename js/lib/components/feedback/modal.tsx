import React, { useState } from "react";
import Modal from "react-modal";
import Highlighter from "web-highlighter";

Modal.setAppElement("body");

const modalStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};

type FeedbackModalProps = { range: Range; highlighter: Highlighter; toggleModal: () => void };
const FeedbackModal: React.FC<FeedbackModalProps> = ({ range, highlighter, toggleModal }) => {
  const [feedback, setFeedback] = useState("");

  const handleFeedbackChange = (e: React.FormEvent<HTMLTextAreaElement>) => {
    setFeedback(e.currentTarget.value);
  };

  const handleSubmit = () => {
    // add feedback to serialized highlighter data (dispose hook after use)
    let dispose = highlighter.hooks.Serialize.RecordInfo.tap(() => feedback);
    highlighter.fromRange(range);
    dispose();

    toggleModal();
  };

  return (
    <Modal style={modalStyles} contentLabel="Feedback Modal" onRequestClose={toggleModal} isOpen>
      <textarea
        style={{ minWidth: "250px" }}
        rows={4}
        placeholder="Your feedback..."
        value={feedback}
        onChange={handleFeedbackChange}
      ></textarea>
      <br />
      <button onClick={handleSubmit}>Submit</button>
    </Modal>
  );
};

export default FeedbackModal;
