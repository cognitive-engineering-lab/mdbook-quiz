import React from "react";

let Prompt: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <div className="prompt">
    <h4>Prompt</h4>
    {children}
  </div>
);

let Response: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <form className="response">
    <h4>Response</h4>
    {children}
  </form>
);

export abstract class QuestionViewBase<Q, A> extends React.Component<{
  question: Q;
}> {
  private container: React.RefObject<HTMLDivElement>;

  constructor(props: any) {
    super(props);
    this.container = React.createRef();
  }

  abstract className(): string;

  abstract renderPrompt(): JSX.Element;

  abstract renderResponse(): JSX.Element;

  abstract getAnswerFromDOM(container: HTMLDivElement): A;

  getAnswer(): any {
    return this.getAnswerFromDOM(this.container.current!);
  }

  render() {
    return (
      <div className={this.className()} ref={this.container}>
        <Prompt>{this.renderPrompt()}</Prompt>
        <Response>{this.renderResponse()}</Response>
      </div>
    );
  }
}
