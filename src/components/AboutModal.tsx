import { Modal } from "@material-ui/core";
import * as React from "react";
import About from "./About";
import EventBus from "./EventBus";

interface Props {
  open: boolean;
  eventBus: EventBus;
}

export default class AboutModal extends React.Component<Props> {
  render() {
    return (
      <Modal
        open={this.props.open}
        onClose={() => {
          this.props.eventBus.closeAboutInfo();
        }}
      >
        <About eventBus={this.props.eventBus} />
      </Modal>
    );
  }
}
