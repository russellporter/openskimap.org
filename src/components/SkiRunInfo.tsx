import { Avatar, Card, CardContent, Chip, Typography } from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import HighlightIcon from "@material-ui/icons/Highlight";
import LocalHospitalIcon from "@material-ui/icons/LocalHospital";
import WarningIcon from "@material-ui/icons/Warning";
import turfLength from "@turf/length";
import { Feature, LineString } from "geojson";
import {
  RunFeature,
  RunGrooming,
  RunProperties,
  RunUse
} from "openskidata-format";
import * as React from "react";
import loadElevationProfile, {
  ElevationData,
  extractPoints
} from "./ElevationProfileLoader";
import EventBus from "./EventBus";
import { formattedDifficultyName, formattedRunUse } from "./Formatters";
import {
  HeightProfile,
  HeightProfileHighlightProps,
  HeightProfilePlaceholder
} from "./HeightProfile";
import { InfoHeader } from "./InfoHeader";

interface Props extends HeightProfileHighlightProps {
  feature: RunFeature;
  eventBus: EventBus;
}

export const SkiRunInfo: React.FunctionComponent<Props> = props => {
  const feature = props.feature;
  const properties = feature.properties;

  const [terrainData, setTerrainData] = React.useState<{
    isLoading: boolean;
    elevationData: ElevationData | null;
  }>({ isLoading: false, elevationData: null });

  const geometry = props.feature.geometry;

  const distance = React.useMemo(() => {
    return geometry.type === "LineString"
      ? turfLength(
          { type: "Feature", geometry: geometry, properties: {} },
          { units: "meters" }
        )
      : null;
  }, [geometry]);

  React.useEffect(() => {
    if (feature.geometry.type === "LineString") {
      setTerrainData({ isLoading: true, elevationData: null });
      loadElevationProfile(extractPoints(feature as Feature<LineString>)).then(
        elevationData => {
          setTerrainData({ isLoading: false, elevationData: elevationData });
        },
        () => {
          setTerrainData({ isLoading: false, elevationData: null });
        }
      );
    }
  }, [feature]);

  const showHeightProfile =
    feature !== null && feature.geometry.type === "LineString";

  const uses = properties.uses;
  const elevationData = terrainData.elevationData;
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
          {distance ? <span>Distance: {Math.round(distance)}m</span> : null}
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
        {properties.description !== undefined && (
          <Typography>
            <span>Notes: {properties.description}</span>
          </Typography>
        )}
        {feature !== null &&
        distance !== null &&
        elevationData !== null &&
        showHeightProfile ? (
          <HeightProfile
            feature={feature}
            distance={distance}
            elevationData={elevationData}
            chartHighlightPosition={props.chartHighlightPosition}
            onHoverChartPosition={props.onHoverChartPosition}
          />
        ) : terrainData.isLoading ? (
          <HeightProfilePlaceholder />
        ) : null}
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
  const type = formattedRunUse(data.uses);
  if (difficulty && type) {
    return difficulty + " " + type.toLowerCase();
  } else if (difficulty) {
    return difficulty;
  } else {
    return type;
  }
}
