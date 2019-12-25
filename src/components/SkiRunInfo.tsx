import { Avatar, Card, CardContent, Chip, Typography } from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import HighlightIcon from "@material-ui/icons/Highlight";
import LocalHospitalIcon from "@material-ui/icons/LocalHospital";
import WarningIcon from "@material-ui/icons/Warning";
import turfLength from "@turf/length";
import {
  RunFeature,
  RunGrooming,
  RunProperties,
  RunUse
} from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import getElevationData from "./ElevationData";
import EventBus from "./EventBus";
import { formattedDifficultyName, formattedRunUse } from "./Formatters";
import { HeightProfile, HeightProfileHighlightProps } from "./HeightProfile";
import { InfoHeader } from "./InfoHeader";
import getInclinedLengthInMeters from "./utils/InclinedLength";

interface Props extends HeightProfileHighlightProps {
  feature: RunFeature;
  eventBus: EventBus;
}

export const SkiRunInfo: React.FunctionComponent<Props> = props => {
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
  const summary = difficultyText(properties);
  const title = properties.name || summary;
  const subtitle = properties.name ? summary : null;
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography gutterBottom variant="h5" component="h2">
            {title}
          </Typography>
          {properties.ref && (
            <Badge text={properties.ref} color={properties.color} />
          )}
        </InfoHeader>
        {subtitle && <Typography>{subtitle}</Typography>}
        <div>
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
        </div>
        <Typography className={"distance-and-elevation-info"}>
          {inclinedDistance ? (
            <span>Distance: {Math.round(inclinedDistance)}m</span>
          ) : null}
          {elevationData && elevationData.ascent > 1 ? (
            <span>Ascent: {Math.round(elevationData.ascent)}m</span>
          ) : null}
          {elevationData && elevationData.descent > 1 ? (
            <span>Descent: {Math.round(elevationData.descent)}m</span>
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
        {feature !== null && distance !== null && elevationData !== null && (
          <HeightProfile
            feature={feature}
            distance={distance}
            elevationData={elevationData}
            chartHighlightPosition={props.chartHighlightPosition}
            onHoverChartPosition={props.onHoverChartPosition}
          />
        )}
      </CardContent>
    </Card>
  );
};

const GroomingLabel: React.SFC<{ feature: RunFeature }> = props => {
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

function difficultyText(data: RunProperties) {
  const difficulty = data.difficulty
    ? formattedDifficultyName(data.difficulty)
    : null;
  const type = formattedRunUse(data.uses, data.grooming);
  if (difficulty && type) {
    return difficulty + " " + type.toLowerCase();
  } else if (difficulty) {
    return difficulty;
  } else {
    return type;
  }
}
