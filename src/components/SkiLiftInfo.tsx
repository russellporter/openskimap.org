import { Avatar, Card, CardContent, Typography } from "@material-ui/core";
import turfLength from "@turf/length";
import { LineString } from "geojson";
import { getLiftNameAndType, LiftFeature } from "openskidata-format";
import * as React from "react";
import loadElevationProfile, {
  ElevationData,
  extractEndpoints
} from "./ElevationProfileLoader";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { StatusIcon } from "./StatusIcon";
export const SkiLiftInfo: React.FunctionComponent<{
  eventBus: EventBus;
  feature: LiftFeature;
}> = props => {
  const properties = props.feature.properties;

  const [data, setData] = React.useState<{
    speed: number | null;
    elevationData: ElevationData | null;
  }>({ speed: null, elevationData: null });

  const geometry = props.feature.geometry;
  const durationInSeconds = props.feature.properties.duration;

  const distance = React.useMemo(() => {
    return geometry.type === "LineString"
      ? turfLength(
          { type: "Feature", geometry: geometry, properties: {} },
          { units: "meters" }
        )
      : null;
  }, [geometry]);

  React.useEffect(() => {
    if (geometry.type === "LineString") {
      loadElevationProfile(extractEndpoints(geometry as LineString)).then(
        elevationData => {
          const elevationChange = Math.max(
            elevationData.ascent,
            elevationData.descent
          );
          let speed = null;
          if (distance !== null && durationInSeconds !== null) {
            const slopeDistance = Math.sqrt(
              Math.pow(distance, 2) + Math.pow(elevationChange, 2)
            );
            speed = slopeDistance / durationInSeconds;
          }

          setData({ elevationData: elevationData, speed: speed });
        }
      );
    }
  }, [durationInSeconds, geometry]);

  const elevationData = data.elevationData;
  const speed = data.speed;
  const badge = properties.ref;
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography variant="h5" component="h2">
            {getLiftNameAndType(properties)}
          </Typography>
          {badge && (
            <Avatar
              style={{
                backgroundColor: properties.color,
                width: 31,
                height: 31,
                marginLeft: "5px"
              }}
            >
              {badge}
            </Avatar>
          )}
          {properties.status && (
            <div style={{ marginLeft: "5px" }}>
              <StatusIcon
                status={properties.status}
                entityName={"lift"}
                hideIfOperating={true}
              />
            </div>
          )}
        </InfoHeader>
        {
          <div className={"distance-and-elevation-info"}>
            {distance && <span>Distance: {Math.round(distance)}m</span>}
            {elevationData && elevationData.ascent > 1 && (
              <span>Ascent: {Math.round(elevationData.ascent)}m</span>
            )}
            {elevationData && elevationData.descent > 1 && (
              <span>Descent: {Math.round(elevationData.descent)}m</span>
            )}
            {speed && <span>Speed: {speed.toFixed(1)} m/s</span>}
          </div>
        }
      </CardContent>
    </Card>
  );
};
