import { styled } from "@mui/material/styles";
import * as React from "react";
import { TopRightCloseButton } from "./CloseButton";

const Root = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: theme.spacing(1),
}));

export const ModalHeader: React.FunctionComponent<
  React.PropsWithChildren<{
    onClose: () => void;
  }>
> = (props) => {
  return (
    <Root>
      <div>{props.children}</div>
      <TopRightCloseButton onClick={props.onClose} size="large" />
    </Root>
  );
};
