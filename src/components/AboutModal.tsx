import { Dialog, makeStyles } from "@material-ui/core";
import * as React from "react";
import About from "./About";
import EventBus from "./EventBus";

const useStyles = makeStyles((theme) => ({
  paper: {
    padding: theme.spacing(4),
  },
}));

export const AboutModal: React.FunctionComponent<{
  open: boolean;
  eventBus: EventBus;
}> = (props) => {
  const classes = useStyles();

  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeAboutInfo();
      }}
    >
      <div className={classes.paper}>
        <About eventBus={props.eventBus} />
      </div>
    </Dialog>
  );
};
