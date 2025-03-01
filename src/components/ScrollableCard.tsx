import { Card, CardContent } from "@mui/material";
import React from "react";

export const ScrollableCard: React.FunctionComponent<
  React.PropsWithChildren<{
    header: JSX.Element;
    footer?: JSX.Element;
    width?: number;
  }>
> = (props) => {
  return (
    <Card
      style={{
        overflowY: "auto",
        maxHeight: "calc(100dvh - 78px)",
        width: props.width,
      }}
    >
      {props.header}
      <CardContent style={{ paddingTop: "0px" }}>{props.children}</CardContent>
      <div
        style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: "white",
          zIndex: 1,
        }}
      >
        {props.footer}
      </div>
    </Card>
  );
};
