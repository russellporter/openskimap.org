import { makeStyles } from "@material-ui/core";
import * as React from "react";
import { TopRightCloseButton } from "./CloseButton";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  content: {
    display: "inline-flex",
    "&:last-child": {
      marginRight: 0
    },
    "& > *": {
      marginRight: theme.spacing(1)
    }
  }
}));

export const InfoHeader: React.FunctionComponent<{
  onClose: () => void;
}> = props => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <span className={classes.content}>{props.children}</span>
      <TopRightCloseButton onClick={props.onClose} />
    </div>
  );
};
