import { makeStyles } from "@material-ui/core";
import * as React from "react";
import { TopRightCloseButton } from "./CloseButton";
import { InfoBreadcrumbs, InfoBreadcrumbsProps } from "./InfoBreadcrumbs";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  breadcrumbsAndContent: {},
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
  breadcrumbs?: InfoBreadcrumbsProps;
}> = props => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.breadcrumbsAndContent}>
        {props.breadcrumbs && <InfoBreadcrumbs {...props.breadcrumbs} />}
        <span className={classes.content}>{props.children}</span>
      </div>
      <TopRightCloseButton onClick={props.onClose} />
    </div>
  );
};
