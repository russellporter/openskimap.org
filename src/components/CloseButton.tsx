import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import * as React from "react";

export const TopRightCloseButton: React.FunctionComponent<{
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}> = (props) => {
  return (
    <IconButton
      style={{ marginRight: "-16px", marginTop: "-16px" }}
      aria-label="Close"
      onClick={props.onClick}
      size="large">
      <CloseIcon />
    </IconButton>
  );
};
