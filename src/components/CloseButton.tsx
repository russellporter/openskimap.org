import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
import * as React from "react";

export const TopRightCloseButton: React.FunctionComponent<{
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  size?: "small" | "medium" | "large";
}> = (props) => {
  return (
    <IconButton
      aria-label="Close"
      onClick={props.onClick}
      size={props.size ?? "medium"}
    >
      <CloseIcon />
    </IconButton>
  );
};
