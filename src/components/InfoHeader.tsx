import * as React from "react";
import { TopRightCloseButton } from "./CloseButton";

export const InfoHeader: React.FunctionComponent<{
  onClose: () => void;
}> = props => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      }}
    >
      <span style={{ display: "inline-flex" }}>{props.children}</span>
      <TopRightCloseButton onClick={props.onClose} />
    </div>
  );
};
