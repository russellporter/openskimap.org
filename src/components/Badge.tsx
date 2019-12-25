import { Avatar } from "@material-ui/core";
import * as React from "react";

export const Badge: React.FunctionComponent<{
  text: string;
  color: string;
}> = props => {
  return (
    <Avatar
      style={{
        backgroundColor: props.color,
        width: 31,
        height: 31,
        marginLeft: "5px"
      }}
    >
      {props.text}
    </Avatar>
  );
};
