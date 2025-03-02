import { CardActions, Typography } from "@mui/material";
import {
  getLiftColor,
  getLiftElevationData,
  getLiftNameAndType,
  LiftFeature,
  Status,
} from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import { CardHeader } from "./CardHeader";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { ScrollableCard } from "./ScrollableCard";
import { SourceSummary } from "./SourceSummary";
import { StatusIcon } from "./StatusIcon";
import * as UnitHelpers from "./utils/UnitHelpers";
import { formattedSlope } from "./utils/formattedSlope";

export const SkiLiftInfo: React.FunctionComponent<{
  eventBus: EventBus;
  feature: LiftFeature;
  unitSystem: UnitHelpers.UnitSystem;
  width?: number;
}> = (props) => {
  const properties = props.feature.properties;
  const elevationData = React.useMemo(() => {
    return getLiftElevationData(props.feature);
  }, [props.feature]);

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
      <Typography gutterBottom variant="h5" component="h2">
        {properties.ref && (
          <span style={{ display: "inline-block", marginRight: "8px" }}>
            <Badge
              text={properties.ref}
              color={getLiftColor(properties.status)}
            />
          </span>
        )}
        {properties.status && properties.status !== Status.Operating && (
          <span style={{ display: "inline-block", marginRight: "8px" }}>
            <StatusIcon status={properties.status} entityName={"lift"} />
          </span>
        )}
        <span style={{ verticalAlign: "middle" }}>
          {getLiftNameAndType(properties)}
        </span>
      </Typography>
      <div className={"distance-and-elevation-info"}>
        {elevationData && (
          <>
            <Typography>
              Distance:{" "}
              {UnitHelpers.distanceText({
                distanceInMeters: elevationData.inclinedLengthInMeters,
                unitSystem: props.unitSystem,
              })}
            </Typography>
          </>
        )}
        {elevationData && (
          <Typography>
            Vertical:{" "}
            {UnitHelpers.heightText(
              elevationData.verticalInMeters,
              props.unitSystem
            )}
          </Typography>
        )}
        {elevationData && elevationData.speedInMetersPerSecond && (
          <Typography>
            Speed: {elevationData.speedInMetersPerSecond.toFixed(1)} m/s
          </Typography>
        )}
        {elevationData && elevationData.overallPitchInPercent && (
          <Typography>
            Average Slope: {formattedSlope(elevationData.overallPitchInPercent)}
          </Typography>
        )}
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
