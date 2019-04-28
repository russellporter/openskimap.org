import * as React from "react";

interface LabelWithIconProps {
  appearance: string;
  icon?: string;
  text: string;
}

export const LabelWithIcon: React.SFC<LabelWithIconProps> = props => {
  return (
    <span className={"label label-" + props.appearance}>
      {props.text}
      {props.icon ? (
        <React.Fragment>
          {" "}
          <span className={"glyphicon glyphicon-" + props.icon} />
        </React.Fragment>
      ) : null}
    </span>
  );
};
