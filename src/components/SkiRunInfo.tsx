import {
  Avatar,
  Card,
  CardContent,
  Chip,
  makeStyles,
  Typography
} from "@material-ui/core";
import ArrowForwardIcon from "@material-ui/icons/ArrowForward";
import HighlightIcon from "@material-ui/icons/Highlight";
import LocalHospitalIcon from "@material-ui/icons/LocalHospital";
import WarningIcon from "@material-ui/icons/Warning";
import turfLength from "@turf/length";
import { LineString } from "geojson";
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
import { HeightProfile, HeightProfileHighlightProps } from "./HeightProfile";
import { InfoHeader } from "./InfoHeader";
import { FullRunFeature } from "./Model";
import { SourceSummary } from "./SourceSummary";
import getInclinedLengthInMeters from "./utils/InclinedLength";
import { getRunTitleAndSubtitle } from "./utils/PageTitle";

interface Props extends HeightProfileHighlightProps {
  feature: FullRunFeature;
  eventBus: EventBus;
}

const useStyles = makeStyles(theme => ({
  chips: {
    "&:last-child": {
      marginRight: 0
    },
    "& > *": {
      marginRight: theme.spacing(1)
    }
  }
}));

export const SkiRunInfo: React.FunctionComponent<Props> = props => {
  const classes = useStyles();
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
  return (
    <Card>
      <CardContent>
        <InfoHeader
          onClose={props.eventBus.hideInfo}
          breadcrumbs={{
            eventBus: props.eventBus,
            feature: props.feature
          }}
        >
          {properties.ref && (
            <Badge text={properties.ref} color={properties.color} />
          )}
          <Typography gutterBottom variant="h5" component="h2">
            {title}
          </Typography>
        </InfoHeader>
        {subtitle && <Typography>{subtitle}</Typography>}
        <div className={classes.chips}>
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
        {distance !== null && elevationData !== null && (
          <HeightProfile
            feature={feature as GeoJSON.Feature<LineString, RunProperties>}
            distance={distance}
            elevationData={elevationData}
            chartHighlightPosition={props.chartHighlightPosition}
            onHoverChartPosition={props.onHoverChartPosition}
          />
        )}
        {<SourceSummary sources={properties.sources} />}
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
