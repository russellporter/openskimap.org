import { Chip, makeStyles } from "@material-ui/core";
import * as React from "react";

const useStyles = makeStyles(theme => ({
  label: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    color: "white",
    fontSize: "1.25rem"
  },
  root: {
    minWidth: "32px",
    flexShrink: 0
  }
}));

export const Badge: React.FunctionComponent<{
  text: string;
  color: string;
}> = props => {
  const classes = useStyles();

  return (
    <Chip
      label={props.text}
      classes={{
        root: classes.root,
        label: classes.label
      }}
      style={{
        backgroundColor: props.color
      }}
    />
  );
};
