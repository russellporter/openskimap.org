import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HighlightIcon from "@mui/icons-material/Highlight";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningIcon from "@mui/icons-material/Warning";
import { Avatar, CardActions, Chip, Typography } from "@mui/material";
import turfLength from "@turf/length";
import { LineString } from "geojson";
import {
  getRunColor,
  RunFeature,
  RunGrooming,
  RunProperties,
  RunUse,
} from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import { CardHeader } from "./CardHeader";
import getElevationData from "./ElevationData";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { HeightProfile, HeightProfileHighlightProps } from "./HeightProfile";
import { ScrollableCard } from "./ScrollableCard";
import { SourceSummary } from "./SourceSummary";
import getInclinedLengthInMeters from "./utils/InclinedLength";
import { getRunTitleAndSubtitle } from "./utils/PageMetadata";
import * as UnitHelpers from "./utils/UnitHelpers";

interface Props extends HeightProfileHighlightProps {
  feature: RunFeature;
  eventBus: EventBus;
  unitSystem: UnitHelpers.UnitSystem;
  width?: number;
}

export const SkiRunInfo: React.FunctionComponent<Props> = (props) => {
  const feature = props.feature;
  const properties = feature.properties;
  const geometry = props.feature.geometry;
  const elevationProfile = feature.properties.elevationProfile;

  const distance = React.useMemo(() => {
    return geometry.type === "LineString"
      ? turfLength(
          { type: "Feature", geometry: geometry, properties: {} },
          { units: "meters" }
        )
      : null;
  }, [geometry]);

  const inclinedDistance = React.useMemo(() => {
    return geometry.type === "LineString"
      ? getInclinedLengthInMeters(geometry)
      : null;
  }, [geometry]);

  const elevationData = React.useMemo(() => {
    return geometry.type === "LineString" && elevationProfile
      ? getElevationData(geometry, elevationProfile)
      : null;
  }, [geometry, elevationProfile]);
  const slopeInfo = elevationData && elevationData.slopeInfo;
  const { title, subtitle } = getRunTitleAndSubtitle(props.feature.properties);
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
              color={getRunColor(
                properties.difficultyConvention,
                properties.difficulty
              )}
            />
          </span>
        )}
        {title}
      </Typography>
      {subtitle && <Typography>{subtitle}</Typography>}
      <GroomingLabel feature={feature} />
      {properties.oneway === true &&
      !properties.uses.includes(RunUse.Downhill) ? (
        <Chip
          avatar={
            <Avatar>
              <ArrowForwardIcon />
            </Avatar>
          }
          label="One Way"
        />
      ) : null}
      {properties.lit === true ? (
        <Chip
          avatar={
            <Avatar>
              <HighlightIcon />
            </Avatar>
          }
          label="Night Lit"
        />
      ) : null}
      {properties.gladed === true ? <Chip label="Gladed" /> : null}
      {properties.patrolled === true ? (
        <Chip
          avatar={
            <Avatar>
              <LocalHospitalIcon />
            </Avatar>
          }
          label="Patrolled"
        />
      ) : null}
      {properties.patrolled === false ? (
        <Chip
          avatar={
            <Avatar>
              <WarningIcon />
            </Avatar>
          }
          label="Not Patrolled"
        />
      ) : null}
      <Typography className={"distance-and-elevation-info"}>
        {inclinedDistance ? (
          <span>
            Distance:{" "}
            {UnitHelpers.distanceText({
              distanceInMeters: inclinedDistance,
              unitSystem: props.unitSystem,
            })}
          </span>
        ) : null}
        {elevationData && elevationData.ascent > 1 ? (
          <span>
            Ascent:{" "}
            {UnitHelpers.heightText(elevationData.ascent, props.unitSystem)}
          </span>
        ) : null}
        {elevationData && elevationData.descent > 1 ? (
          <span>
            Descent:{" "}
            {UnitHelpers.heightText(elevationData.descent, props.unitSystem)}
          </span>
        ) : null}
      </Typography>
      {slopeInfo && (
        <Typography className={"distance-and-elevation-info"}>
          {slopeInfo.average !== null && (
            <span>Average Slope: {formattedSlope(slopeInfo.average)}</span>
          )}
          {slopeInfo.max !== null && (
            <span>Max Slope: {formattedSlope(slopeInfo.max)}</span>
          )}
        </Typography>
      )}
      {properties.description && (
        <Typography>
          <span>Notes: {properties.description}</span>
        </Typography>
      )}
      {distance !== null && elevationData !== null && (
        <HeightProfile
          feature={feature as GeoJSON.Feature<LineString, RunProperties>}
          distance={distance}
          elevationData={elevationData}
          chartHighlightPosition={props.chartHighlightPosition}
          onHoverChartPosition={props.onHoverChartPosition}
          unitSystem={props.unitSystem}
        />
      )}
      {<SourceSummary sources={properties.sources} />}
    </ScrollableCard>
  );
};

const GroomingLabel: React.FunctionComponent<{ feature: RunFeature }> = (
  props
) => {
  const grooming = props.feature.properties.grooming;
  const isNordic = props.feature.properties.uses.includes(RunUse.Nordic);

  let text;
  switch (grooming) {
    case RunGrooming.Classic:
      text = isNordic ? "Classic" : "Groomed";
      break;
    case RunGrooming.Skating:
      text = "Skate";
      break;
    case RunGrooming.ClassicAndSkating:
      text = "Classic & Skate";
      break;
    case RunGrooming.Mogul:
      text = "Moguls";
      break;
    case RunGrooming.Scooter:
      text = isNordic ? "Classic (narrow)" : "Groomed (narrow)";
      break;
    case RunGrooming.Backcountry:
      text = "Ungroomed";
      break;
    default:
      return null;
  }

  return <Chip label={text} />;
};

function formattedSlope(slopePercent: number) {
  const percent = Math.round(Math.abs(slopePercent * 100)) + "%";
  const degrees =
    Math.round(Math.abs((Math.atan(slopePercent) / Math.PI) * 180)) + "°";
  return degrees + " (" + percent + ")";
}
