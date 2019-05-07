import { IconButton } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import * as React from "react";

export const TopRightCloseButton: React.FunctionComponent<{
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}> = props => {
  return (
    <IconButton
      style={{ marginRight: "-16px", marginTop: "-16px" }}
      aria-label="Close"
      onClick={props.onClick}
    >
      <CloseIcon />
    </IconButton>
  );
};
