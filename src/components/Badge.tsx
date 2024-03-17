import { Chip, styled } from "@mui/material";
import * as React from "react";

const StyledChip = styled(Chip)(({ theme }) => ({
  "& .MuiChip-label": {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    color: "white",
    fontSize: "1.25rem",
  },
  minWidth: "32px",
  flexShrink: 0,
}));

export const Badge: React.FunctionComponent<{
  text: string;
  color: string;
}> = (props) => {
  return (
    <StyledChip
      label={props.text}
      style={{
        backgroundColor: props.color,
      }}
    />
  );
};
