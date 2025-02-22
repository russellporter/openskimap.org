import { CardActions, Typography } from "@mui/material";
import { getLiftNameAndType, LiftFeature } from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import { CardHeader } from "./CardHeader";
import { CoordinatesWithElevation, getAscentAndDescent } from "./ElevationData";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { ScrollableCard } from "./ScrollableCard";
import { SourceSummary } from "./SourceSummary";
import { StatusIcon } from "./StatusIcon";
import getInclinedLengthInMeters from "./utils/InclinedLength";
import * as UnitHelpers from "./utils/UnitHelpers";

export const SkiLiftInfo: React.FunctionComponent<{
  eventBus: EventBus;
  feature: LiftFeature;
  unitSystem: UnitHelpers.UnitSystem;
  width?: number;
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
  const actions = getWebsiteActions(properties.websites);
  return (
    <ScrollableCard
      width={props.width}
      header={
        <CardHeader
          onClose={props.eventBus.hideInfo}
          breadcrumbs={{
            eventBus: props.eventBus,
            feature: props.feature,
          }}
        />
      }
      footer={
        actions.length > 0 ? <CardActions>{actions}</CardActions> : undefined
      }
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
      <div className={"distance-and-elevation-info"}>
        {distance && (
          <>
            <Typography>
              Distance:{" "}
              {UnitHelpers.distanceText({
                distanceInMeters: distance,
                unitSystem: props.unitSystem,
              })}
            </Typography>
          </>
        )}
        {ascentAndDescent && ascentAndDescent.ascent > 1 && (
          <Typography>
            Ascent:{" "}
            {UnitHelpers.heightText(ascentAndDescent.ascent, props.unitSystem)}
          </Typography>
        )}
        {ascentAndDescent && ascentAndDescent.descent > 1 && (
          <Typography>
            Descent:{" "}
            {UnitHelpers.heightText(ascentAndDescent.descent, props.unitSystem)}
          </Typography>
        )}
        {speed && <Typography>Speed: {speed.toFixed(1)} m/s</Typography>}
      </div>
      {properties.description && (
        <Typography>
          <span>Notes: {properties.description}</span>
        </Typography>
      )}
      {<SourceSummary sources={properties.sources} />}
    </ScrollableCard>
  );
};
