import {
  Card,
  CardActions,
  CardContent,
  Tooltip,
  Typography,
} from "@mui/material";
import Button from "@mui/material/Button";
import {
  Activity,
  LiftStatistics,
  LiftStatisticsByTypeKey,
  LiftType,
  RunConvention,
  RunDifficulty,
  SkiAreaFeature,
  SkiAreaProperties,
  SkiAreaStatistics,
  SourceType,
  getFormattedLiftType,
  getRunColor,
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { formattedActivityName, formattedDifficultyName } from "./Formatters";
import { InfoHeader } from "./InfoHeader";
import { SkiAreaFavoriteControl } from "./SkiAreaFavoriteControl";
import { SourceSummary } from "./SourceSummary";
import { StatusIcon } from "./StatusIcon";

export const panToZoomLevel = 12.5;

interface SkiAreaPopupProps {
  feature: SkiAreaFeature;
  eventBus: EventBus;
}

export const SkiAreaInfo: React.FunctionComponent<SkiAreaPopupProps> = (
  props
) => {
  const properties = props.feature.properties;
  const actions = getActions(properties);
  return (
    <Card>
      <CardContent>
        <InfoHeader
          onClose={props.eventBus.hideInfo}
          breadcrumbs={{ eventBus: props.eventBus, feature: props.feature }}
        >
          <StatusIcon
            status={properties.status}
            entityName={"ski area"}
            hideIfOperating={true}
          />
          <Typography variant="h5" component="h2">
            {getTitle(properties)}
          </Typography>
        </InfoHeader>
        {properties.statistics && (
          <SkiAreaStatisticsSummary
            activities={properties.activities}
            statistics={properties.statistics}
            runConvention={properties.runConvention}
          />
        )}
        {<SourceSummary sources={properties.sources} />}
      </CardContent>
      {actions.length > 0 && <CardActions>{actions}</CardActions>}
    </Card>
  );
};

function getActions(properties: SkiAreaProperties): JSX.Element[] {
  const skimapOrgSource = properties.sources.find(
    (s) => s.type === SourceType.SKIMAP_ORG
  );
  let actions = [];
  if (skimapOrgSource) {
    actions.push(
      <Button
        key="paperMaps"
        size="small"
        color="primary"
        target="_blank"
        href={"https://skimap.org/SkiAreas/view/" + skimapOrgSource.id}
      >
        See Paper Maps
      </Button>
    );
  }

  actions = actions.concat(getWebsiteActions(properties.websites));

  actions = actions.concat(
    <SkiAreaFavoriteControl skiAreaProperties={properties} />
  );

  return actions;
}

function getTitle(properties: SkiAreaProperties) {
  if (properties.name) {
    return properties.name;
  }

  let summary: string;
  const downhill = properties.activities.includes(Activity.Downhill);
  const nordic = properties.activities.includes(Activity.Nordic);
  if (downhill && nordic) {
    summary = "Downhill & Nordic Ski Area";
  } else if (downhill) {
    summary = "Downhill Ski Area";
  } else if (nordic) {
    summary = "Nordic Ski Area";
  } else {
    summary = "Ski Area";
  }

  const locality = properties.location?.localized.en.locality;
  if (locality) {
    return summary + " near " + locality;
  } else {
    return summary;
  }
}

function elevationSummary(
  statistics: SkiAreaStatistics,
  activities: Activity[]
) {
  const minElevation = statistics.minElevation;
  const maxElevation = statistics.maxElevation;

  if (!maxElevation || !minElevation) {
    return null;
  }

  const vertical = maxElevation - minElevation;
  const minAndMaxElevation =
    Math.round(minElevation) + "m - " + Math.round(maxElevation) + "m";
  return (
    <Typography variant="subtitle1" color="textSecondary">
      {activities.includes(Activity.Downhill)
        ? "Vertical: " + Math.round(vertical) + "m (" + minAndMaxElevation + ")"
        : "Elevation: " + minAndMaxElevation}
    </Typography>
  );
}

const SkiAreaStatisticsSummary: React.FunctionComponent<{
  activities: Activity[];
  statistics: SkiAreaStatistics;
  runConvention: RunConvention;
}> = (props) => {
  const allActivities: Activity[] = [
    Activity.Downhill,
    Activity.Nordic,
    Activity.Backcountry,
  ];
  const difficulties: (RunDifficulty | null)[] = [
    RunDifficulty.NOVICE,
    RunDifficulty.EASY,
    RunDifficulty.INTERMEDIATE,
    RunDifficulty.ADVANCED,
    RunDifficulty.EXPERT,
    RunDifficulty.FREERIDE,
    RunDifficulty.EXTREME,
    null,
  ];
  const runStatistics: [Activity, [RunDifficulty | null, number][]][] =
    allActivities.flatMap((activity) => {
      const statisticsForActivity = props.statistics.runs.byActivity[activity];
      if (statisticsForActivity !== undefined) {
        return [
          [
            activity,
            difficulties.flatMap((difficulty) => {
              const statisticsForDifficulty =
                statisticsForActivity.byDifficulty[difficulty || "other"];
              if (statisticsForDifficulty !== undefined) {
                return [[difficulty, statisticsForDifficulty.lengthInKm]];
              }
              return [];
            }),
          ],
        ];
      }
      return [];
    });

  return (
    <>
      {elevationSummary(props.statistics, props.activities)}
      {runStatistics.map((activityStatistics) => {
        const totalRunKm = activityStatistics[1].reduce((previous, current) => {
          return previous + current[1];
        }, 0);

        const roundedTotalKm = Math.round(totalRunKm);
        if (roundedTotalKm === 0) {
          return null;
        }

        return (
          <div key={activityStatistics[0]}>
            <Typography variant="subtitle1" color="textSecondary">
              {formattedActivityName(activityStatistics[0])}
              {" runs: "}
              {roundedTotalKm} km
            </Typography>
            <RunDifficultyBarChart
              activity={activityStatistics[0]}
              totalRunKm={totalRunKm}
              runConvention={props.runConvention}
              data={activityStatistics[1]}
            />
          </div>
        );
      })}
      {getFormattedLiftStatistics(props.statistics.lifts)}
    </>
  );
};

type LiftCategory =
  | LiftType.Funicular
  | LiftType.CableCar
  | LiftType.Gondola
  | LiftType.MixedLift
  | LiftType.ChairLift
  | "surface";

type LiftStatisticsByCategory = Map<LiftCategory, { count: number }>;

function getFormattedLiftStatistics(statistics: LiftStatistics) {
  const liftStatisticsByCategory: LiftStatisticsByCategory = new Map<
    LiftCategory,
    { count: number }
  >([
    // Rack railway counting is unreliable, disabled for now
    // [LiftType.RackRailway, {count: 0}],
    [LiftType.Funicular, { count: 0 }],
    [LiftType.CableCar, { count: 0 }],
    [LiftType.Gondola, { count: 0 }],
    [LiftType.MixedLift, { count: 0 }],
    [LiftType.ChairLift, { count: 0 }],
    ["surface", { count: 0 }],
  ]);
  const statisticsByLiftType = statistics.byType;
  (Object.keys(statisticsByLiftType) as LiftStatisticsByTypeKey[]).forEach(
    (liftType) => {
      const count = statisticsByLiftType[liftType]!.count;
      switch (liftType) {
        case LiftType.CableCar:
        case LiftType.Funicular:
        case LiftType.CableCar:
        case LiftType.Gondola:
        case LiftType.MixedLift:
        case LiftType.ChairLift:
          liftStatisticsByCategory.get(liftType)!.count += count;
          break;
        case LiftType.DragLift:
        case LiftType.JBar:
        case LiftType.MagicCarpet:
        case LiftType.Platter:
        case LiftType.RopeTow:
        case LiftType.TBar:
          liftStatisticsByCategory.get("surface")!.count += count;
          break;
      }
    }
  );

  const formattedStatistics = [...liftStatisticsByCategory.entries()].flatMap(
    (entry) => {
      const category = entry[0];
      const statistics = entry[1];
      if (statistics.count === 0) {
        return [];
      }

      return [
        statistics.count +
        " " +
        getLiftCategoryName(category) +
        (statistics.count === 1 ? "" : "s"),
      ];
    }
  );

  if (formattedStatistics.length === 0) {
    return null;
  }

  return (
    <Typography variant="subtitle1" color="textSecondary">
      Lifts: {formattedStatistics.join(", ")}
    </Typography>
  );
}

function getLiftCategoryName(category: LiftCategory) {
  switch (category) {
    case "surface":
      return "Surface Lift";
    default:
      return getFormattedLiftType(category);
  }
}

const RunDifficultyBarChart: React.FunctionComponent<{
  runConvention: RunConvention;
  activity: Activity;
  totalRunKm: number;
  data: [RunDifficulty | null, number][];
}> = (props) => {
  const parts = props.data.map((d) => {
    const runKm = d[1];
    const percentage = (runKm / props.totalRunKm) * 100.0;
    const difficulty = d[0];

    const difficultyText = difficulty
      ? formattedDifficultyName(difficulty)
      : "Other";
    const distanceText = Math.round(runKm * 10) / 10 + "km";
    return (
      <Tooltip
        key={difficulty || "other"}
        title={difficultyText + " (" + distanceText + ")"}
        placement="bottom"
        PopperProps={{
          popperOptions: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: "0px, -8px",
                },
              },
              {
                name: "flip",
                options: {
                  padding: 0,
                },
              },
            ],
          },
        }}
      >
        <span
          style={{
            width: percentage + "%",
            backgroundColor: getRunColor(props.runConvention, difficulty),
          }}
        ></span>
      </Tooltip>
    );
  });

  return (
    <div style={{ display: "flex", height: "10px", marginBottom: "12px" }}>
      {parts}
    </div>
  );
};
