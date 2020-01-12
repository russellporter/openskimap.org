import { makeStyles, Modal } from "@material-ui/core";
import * as React from "react";
import About from "./About";
import EventBus from "./EventBus";

const useStyles = makeStyles(theme => ({
  paper: {
    position: "absolute",
    maxWidth: theme.spacing(50),
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(4),
    outline: "none",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  }
}));

export const AboutModal: React.FunctionComponent<{
  open: boolean;
  eventBus: EventBus;
}> = props => {
  const classes = useStyles();

  return (
    <Modal
      open={props.open}
      onClose={() => {
        props.eventBus.closeAboutInfo();
      }}
    >
      <div className={classes.paper}>
        <About eventBus={props.eventBus} />
      </div>
    </Modal>
  );
};
