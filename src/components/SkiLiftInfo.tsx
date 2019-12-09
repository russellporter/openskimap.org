import { Avatar, Card, CardContent, Typography } from "@material-ui/core";
import { getLiftNameAndType, LiftFeature } from "openskidata-format";
import * as React from "react";
import { CoordinatesWithElevation, getAscentAndDescent } from "./ElevationData";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { StatusIcon } from "./StatusIcon";
import getInclinedLengthInMeters from "./utils/InclinedLength";
export const SkiLiftInfo: React.FunctionComponent<{
  eventBus: EventBus;
  feature: LiftFeature;
}> = props => {
  const properties = props.feature.properties;
  const geometry = props.feature.geometry;
  const durationInSeconds = props.feature.properties.duration;

  const distance = React.useMemo(() => {
    return geometry.type === "LineString"
      ? getInclinedLengthInMeters(geometry)
      : null;
  }, [geometry]);

  const ascentAndDescent = React.useMemo(() => {
    return geometry.type === "LineString" && geometry.coordinates[0].length >= 3
      ? getAscentAndDescent(geometry.coordinates as CoordinatesWithElevation)
      : null;
  }, [geometry]);

  const speed =
    distance && durationInSeconds ? distance / durationInSeconds : null;
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
            {ascentAndDescent && ascentAndDescent.ascent > 1 && (
              <span>Ascent: {Math.round(ascentAndDescent.ascent)}m</span>
            )}
            {ascentAndDescent && ascentAndDescent.descent > 1 && (
              <span>Descent: {Math.round(ascentAndDescent.descent)}m</span>
            )}
            {speed && <span>Speed: {speed.toFixed(1)} m/s</span>}
          </div>
        }
      </CardContent>
    </Card>
  );
};
