import {
  Card,
  CardActions,
  CardContent,
  Tooltip,
  Typography
} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import WarningIcon from "@material-ui/icons/Warning";
import * as React from "react";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { Activity, SkiAreaData } from "./MapData";
import { StatusIcon } from "./StatusIcon";

interface SkiAreaPopupProps {
  data: SkiAreaData;
  eventBus: EventBus;
}

const CrowdsourcedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography variant="h5" component="h2">
            {props.data.name}{" "}
            <StatusIcon
              status={props.data.status}
              entityName={"ski area"}
              hideIfOperating={false}
            />
          </Typography>
        </InfoHeader>
        <Typography variant="subtitle1" color="textSecondary">
          {activitySummary(props.data)}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          color="primary"
          target="_blank"
          href={"https://skimap.org/SkiAreas/view/" + props.data.id}
        >
          See Paper Maps
        </Button>
      </CardActions>
    </Card>
  );
};

const GeneratedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography gutterBottom variant="h5" component="h2">
            {activitySummary(props.data)}{" "}
            <Tooltip
              placement="right"
              title="This ski area information is generated from OpenStreetMap data"
            >
              <WarningIcon
                fontSize="inherit"
                style={{ verticalAlign: "text-top" }}
              />
            </Tooltip>
          </Typography>
        </InfoHeader>
      </CardContent>
    </Card>
  );
};

export const SkiAreaInfo: React.SFC<SkiAreaPopupProps> = props => {
  return props.data.generated ? (
    <GeneratedSkiArea {...props} />
  ) : (
    <CrowdsourcedSkiArea {...props} />
  );
};

function activitySummary(data: SkiAreaData) {
  const downhill = data.activities.some(
    activity => activity == Activity.Downhill
  );
  const nordic = data.activities.some(activity => activity == Activity.Nordic);
  if (downhill && nordic) {
    return "Downhill & Nordic Ski Area";
  } else if (downhill) {
    return "Downhill Ski Area";
  } else if (nordic) {
    return "Nordic Ski Area";
  } else {
    return "Ski Area";
  }
}
