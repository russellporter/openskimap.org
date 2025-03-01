import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpIcon from "@mui/icons-material/Help";
import { Tooltip } from "@mui/material";
import { Status } from "openskidata-format";
import * as React from "react";

interface Props {
  status: Status | null;
  entityName: string;
}

export const StatusIcon: React.FunctionComponent<Props> = (props) => {
  return (
    <span style={{ flexShrink: 0 }}>
      <Tooltip
        title={tooltipText(props.status, props.entityName)}
        placement="right"
      >
        {icon(props.status)}
      </Tooltip>
    </span>
  );
};

function icon(status: Status | null) {
  const commonStyle = { verticalAlign: "text-top", fontSize: "32px" };
  switch (status) {
    case Status.Proposed:
    case Status.Planned:
    case Status.Construction:
      return <HelpIcon style={{ ...commonStyle, color: "purple" }} />;
    case Status.Operating:
      return <CheckCircleIcon style={{ ...commonStyle, color: "green" }} />;
    case Status.Abandoned:
    case Status.Disused:
      return <CancelIcon style={{ ...commonStyle, color: "red" }} />;
    case null:
      return <HelpIcon style={commonStyle} />;
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
