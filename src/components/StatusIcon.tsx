import { Tooltip } from "@material-ui/core";
import CancelIcon from "@material-ui/icons/Cancel";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import HelpIcon from "@material-ui/icons/Help";
import * as React from "react";
import { Status } from "./MapData";

interface Props {
  status: Status | null;
  entityName: string;
  hideIfOperating: Boolean;
}

export const StatusIcon: React.SFC<Props> = props => {
  if (props.hideIfOperating && props.status === Status.Operating) {
    return null;
  }

  return (
    <Tooltip
      title={tooltipText(props.status, props.entityName)}
      placement="right"
    >
      {icon(props.status)}
    </Tooltip>
  );
};

function icon(status: Status | null) {
  switch (status) {
    case Status.Proposed:
    case Status.Planned:
    case Status.Construction:
      return (
        <HelpIcon
          fontSize="inherit"
          style={{ color: "purple", verticalAlign: "text-top" }}
        />
      );
    case Status.Operating:
      return (
        <CheckCircleIcon
          fontSize="inherit"
          style={{ color: "green", verticalAlign: "text-top" }}
        />
      );
    case Status.Abandoned:
    case Status.Disused:
      return (
        <CancelIcon
          fontSize="inherit"
          style={{ color: "red", verticalAlign: "text-top" }}
        />
      );
    case null:
      return (
        <HelpIcon fontSize="inherit" style={{ verticalAlign: "text-top" }} />
      );
  }
}

function tooltipText(status: Status | null, entityName: string) {
  switch (status) {
    case Status.Proposed:
      return "This " + entityName + " is proposed to be built.";
    case Status.Planned:
      return "This " + entityName + " is planned to be built.";
    case Status.Construction:
      return "This " + entityName + " is under construction.";
    case Status.Operating:
      return "This " + entityName + " is thought to be operational.";
    case Status.Abandoned:
      return "This " + entityName + " is abandoned.";
    case Status.Disused:
      return "This " + entityName + " is not being operated.";
    case null:
      return "The status of this " + entityName + " is unknown.";
  }
}
