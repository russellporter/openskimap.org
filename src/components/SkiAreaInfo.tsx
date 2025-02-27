import { CardActions, Tooltip, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import {
  LiftStatistics,
  LiftStatisticsByTypeKey,
  LiftType,
  RunDifficulty,
  RunDifficultyConvention,
  SkiAreaActivity,
  SkiAreaFeature,
  SkiAreaProperties,
  SkiAreaStatistics,
  SourceType,
  getFormattedLiftType,
  getRunColor,
} from "openskidata-format";
import * as React from "react";
import { CardHeader } from "./CardHeader";
import EventBus from "./EventBus";
import { getWebsiteActions } from "./FeatureActions";
import { formattedActivityName, formattedDifficultyName } from "./Formatters";
import { ScrollableCard } from "./ScrollableCard";
import { SourceSummary } from "./SourceSummary";
import { StatusIcon } from "./StatusIcon";
import * as UnitHelpers from "./utils/UnitHelpers";

export const panToZoomLevel = 12.5;

interface SkiAreaPopupProps {
  feature: SkiAreaFeature;
  eventBus: EventBus;
  unitSystem: UnitHelpers.UnitSystem;
  width?: number;
}

export const SkiAreaInfo: React.FunctionComponent<SkiAreaPopupProps> = (
  props
) => {
  const properties = props.feature.properties;
  const actions = getActions(properties);
  return (
    <ScrollableCard
      width={props.width}
      header={
        <CardHeader
          breadcrumbs={{ eventBus: props.eventBus, feature: props.feature }}
          onClose={props.eventBus.hideInfo}
        />
      }
      footer={
        actions.length > 0 ? <CardActions>{actions}</CardActions> : undefined
      }
    >
      <StatusIcon
        status={properties.status}
        entityName={"ski area"}
        hideIfOperating={true}
      />
      <Typography variant="h5" component="h2">
        {getTitle(properties)}
      </Typography>
      {properties.statistics && (
        <SkiAreaStatisticsSummary
          activities={properties.activities}
          statistics={properties.statistics}
          runConvention={properties.runConvention}
          unitSystem={props.unitSystem}
        />
      )}
      <SourceSummary sources={properties.sources} />
    </ScrollableCard>
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

  return actions;
}

function getTitle(properties: SkiAreaProperties) {
  if (properties.name) {
    return properties.name;
  }

  let summary: string;
  const downhill = properties.activities.includes(SkiAreaActivity.Downhill);
  const nordic = properties.activities.includes(SkiAreaActivity.Nordic);
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
  activities: SkiAreaActivity[],
  unitSystem: UnitHelpers.UnitSystem
) {
  const minElevation = statistics.minElevation;
  const maxElevation = statistics.maxElevation;

  if (!maxElevation || !minElevation) {
    return null;
  }

  const vertical = maxElevation - minElevation;
  const minAndMaxElevation =
    UnitHelpers.heightText(minElevation, unitSystem) +
    " - " +
    UnitHelpers.heightText(maxElevation, unitSystem);
  return (
    <Typography variant="subtitle1" color="textSecondary">
      {activities.includes(SkiAreaActivity.Downhill)
        ? "Vertical: " +
          UnitHelpers.heightText(vertical, unitSystem) +
          " (" +
          minAndMaxElevation +
          ")"
        : "Elevation: " + minAndMaxElevation}
    </Typography>
  );
}

const SkiAreaStatisticsSummary: React.FunctionComponent<{
  activities: SkiAreaActivity[];
  statistics: SkiAreaStatistics;
  runConvention: RunDifficultyConvention;
  unitSystem: UnitHelpers.UnitSystem;
}> = (props) => {
  const allActivities: SkiAreaActivity[] = [
    SkiAreaActivity.Downhill,
    SkiAreaActivity.Nordic,
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
  const runStatistics: [SkiAreaActivity, [RunDifficulty | null, number][]][] =
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
      {elevationSummary(props.statistics, props.activities, props.unitSystem)}
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
              {UnitHelpers.distanceText({
                distanceInMeters: totalRunKm * 1000,
                unitSystem: props.unitSystem,
                forceLongestUnit: true,
                roundToNearestDecimal: true,
              })}
            </Typography>
            <RunDifficultyBarChart
              activity={activityStatistics[0]}
              totalRunKm={totalRunKm}
              runConvention={props.runConvention}
              data={activityStatistics[1]}
              unitSystem={props.unitSystem}
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
  runConvention: RunDifficultyConvention;
  activity: SkiAreaActivity;
  totalRunKm: number;
  data: [RunDifficulty | null, number][];
  unitSystem: UnitHelpers.UnitSystem;
}> = (props) => {
  const parts = props.data.map((d) => {
    const runKm = d[1];
    const percentage = (runKm / props.totalRunKm) * 100.0;
    const difficulty = d[0];

    const difficultyText = difficulty
      ? formattedDifficultyName(difficulty)
      : "Other";
    const distanceText = UnitHelpers.distanceText({
      distanceInMeters: runKm * 1000,
      unitSystem: props.unitSystem,
      forceLongestUnit: true,
      roundToNearestDecimal: true,
    });
    return (
      <Tooltip
        key={difficulty || "other"}
        title={difficultyText + " (" + distanceText + ")"}
        placement="bottom"
        slotProps={{
          popper: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, -8],
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
