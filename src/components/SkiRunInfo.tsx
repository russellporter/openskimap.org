import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HighlightIcon from "@mui/icons-material/Highlight";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningIcon from "@mui/icons-material/Warning";
import { Avatar, CardActions, Chip, Typography } from "@mui/material";
import { LineString } from "geojson";
import {
  getRunColor,
  getRunElevationData,
  RunFeature,
  RunGrooming,
  RunProperties,
  RunUse,
} from "openskidata-format";
import * as React from "react";
import { Badge } from "./Badge";
import { CardHeader } from "./CardHeader";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { HeightProfile, HeightProfileHighlightProps } from "./HeightProfile";
import { ScrollableCard } from "./ScrollableCard";
import { SourceSummary } from "./SourceSummary";
import { formattedSlope } from "./utils/formattedSlope";
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

  const elevationData = React.useMemo(() => {
    return getRunElevationData(feature);
  }, [feature]);
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
        <span style={{ verticalAlign: "middle" }}>{title}</span>
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
        {elevationData && elevationData.inclinedLengthInMeters ? (
          <span>
            Distance:{" "}
            {UnitHelpers.distanceText({
              distanceInMeters: elevationData.inclinedLengthInMeters,
              unitSystem: props.unitSystem,
            })}
          </span>
        ) : null}
        {elevationData && elevationData.ascentInMeters > 1 ? (
          <span>
            Ascent:{" "}
            {UnitHelpers.heightText(
              elevationData.ascentInMeters,
              props.unitSystem
            )}
          </span>
        ) : null}
        {elevationData && elevationData.descentInMeters > 1 ? (
          <span>
            Descent:{" "}
            {UnitHelpers.heightText(
              elevationData.descentInMeters,
              props.unitSystem
            )}
          </span>
        ) : null}
      </Typography>
      {elevationData && (
        <Typography className={"distance-and-elevation-info"}>
          <span>
            Average Slope: {formattedSlope(elevationData.averagePitchInPercent)}
          </span>
          <span>
            Max Slope: {formattedSlope(elevationData.maxPitchInPercent)}
          </span>
        </Typography>
      )}
      {properties.description && (
        <Typography>
          <span>Notes: {properties.description}</span>
        </Typography>
      )}
      {elevationData !== null && (
        <HeightProfile
          feature={feature as GeoJSON.Feature<LineString, RunProperties>}
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
