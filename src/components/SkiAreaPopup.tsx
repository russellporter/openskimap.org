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
import { Activity, SkiAreaData } from "./MapData";
import { PointPopover } from "./PointPopover";
import * as Popup from "./PopupComponents";
import { StatusIcon } from "./StatusIcon";

interface SkiAreaPopupProps {
  data: SkiAreaData;
}

const CrowdsourcedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2">
          <Popup.Title title={props.data.name} />{" "}
          <StatusIcon
            status={props.data.status}
            entityName={"ski area"}
            hideIfOperating={false}
          />
        </Typography>
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

export class SkiAreaPopover extends PointPopover {
  private data: SkiAreaData;

  constructor(position: mapboxgl.LngLatLike, data: SkiAreaData) {
    super(position);
    this.data = data;
  }

  protected render(): React.ReactElement<any> {
    return <SkiAreaInfo data={this.data} />;
  }

  public addTo(map: mapboxgl.Map) {
    super.addTo(map);

    const filter = ["has", "skiArea-" + this.data.id];
    map.setFilter("selected-lift", filter);
    map.setFilter("selected-run", filter);
  }

  public remove(map: mapboxgl.Map) {
    super.remove(map);

    const filter = ["==", "lid", -1];
    map.setFilter("selected-lift", filter);
    map.setFilter("selected-run", filter);
  }
}

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
