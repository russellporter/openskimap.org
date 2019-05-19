import {
  Card,
  CardActions,
  CardContent,
  Tooltip,
  Typography
} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import WarningIcon from "@material-ui/icons/Warning";
import {
  Activity,
  SkiAreaFeature,
  SkiAreaProperties
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { StatusIcon } from "./StatusIcon";

interface SkiAreaPopupProps {
  feature: SkiAreaFeature;
  eventBus: EventBus;
}

const CrowdsourcedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  const properties = props.feature.properties;
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography variant="h5" component="h2">
            {properties.name}{" "}
            <StatusIcon
              status={properties.status}
              entityName={"ski area"}
              hideIfOperating={false}
            />
          </Typography>
        </InfoHeader>
        <Typography variant="subtitle1" color="textSecondary">
          {activitySummary(properties)}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          color="primary"
          target="_blank"
          href={"https://skimap.org/SkiAreas/view/" + properties.id}
        >
          See Paper Maps
        </Button>
      </CardActions>
    </Card>
  );
};

const GeneratedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  const properties = props.feature.properties;
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography gutterBottom variant="h5" component="h2">
            {activitySummary(properties)}{" "}
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
  const properties = props.feature.properties;
  return properties.generated ? (
    <GeneratedSkiArea {...props} />
  ) : (
    <CrowdsourcedSkiArea {...props} />
  );
};

function activitySummary(properties: SkiAreaProperties) {
  const downhill = properties.activities.includes(Activity.Downhill);
  const nordic = properties.activities.includes(Activity.Nordic);
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
