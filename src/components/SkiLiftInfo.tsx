import { Card, CardContent, Typography } from "@material-ui/core";
import { getLiftNameAndType, LiftFeature } from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import { CoordinatesWithElevation, getAscentAndDescent } from "./ElevationData";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { SourceSummary } from "./SourceSummary";
import { StatusIcon } from "./StatusIcon";
import getInclinedLengthInMeters from "./utils/InclinedLength";
export const SkiLiftInfo: React.FunctionComponent<{
  eventBus: EventBus;
  feature: LiftFeature;
}> = (props) => {
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
  return (
    <Card>
      <CardContent>
        <InfoHeader
          onClose={props.eventBus.hideInfo}
          breadcrumbs={{
            eventBus: props.eventBus,
            feature: props.feature,
          }}
        >
          {properties.ref && (
            <Badge text={properties.ref} color={properties.color} />
          )}
          {properties.status && (
            <StatusIcon
              status={properties.status}
              entityName={"lift"}
              hideIfOperating={true}
            />
          )}{" "}
          <Typography variant="h5" component="h2">
            {getLiftNameAndType(properties)}
          </Typography>
        </InfoHeader>
        {
          <div className={"distance-and-elevation-info"}>
            {distance && (
              <Typography>Distance: {Math.round(distance)}m</Typography>
            )}
            {ascentAndDescent && ascentAndDescent.ascent > 1 && (
              <Typography>
                Ascent: {Math.round(ascentAndDescent.ascent)}m
              </Typography>
            )}
            {ascentAndDescent && ascentAndDescent.descent > 1 && (
              <Typography>
                Descent: {Math.round(ascentAndDescent.descent)}m
              </Typography>
            )}
            {speed && <Typography>Speed: {speed.toFixed(1)} m/s</Typography>}
          </div>
        }
        {properties.description && (
          <Typography>
            <span>Notes: {properties.description}</span>
          </Typography>
        )}
        {<SourceSummary sources={properties.sources} />}
      </CardContent>
    </Card>
  );
};
