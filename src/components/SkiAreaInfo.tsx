import {
  Card,
  CardActions,
  CardContent,
  Tooltip,
  Typography
} from "@material-ui/core";
import Button from "@material-ui/core/Button";
import WarningIcon from "@material-ui/icons/Warning";
import {
  Activity,
  getRunColor,
  RunConvention,
  RunDifficulty,
  SkiAreaFeature,
  SkiAreaProperties,
  SourceType,
  Statistics
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";
import { formattedActivityName } from "./Formatters";
import { InfoHeader } from "./InfoHeader";
import { StatusIcon } from "./StatusIcon";

interface SkiAreaPopupProps {
  feature: SkiAreaFeature;
  eventBus: EventBus;
}

const CrowdsourcedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  const properties = props.feature.properties;
  const skimapOrgSource = properties.sources.find(
    s => s.type === SourceType.SKIMAP_ORG
  );
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography variant="h5" component="h2">
            {properties.name}{" "}
            <StatusIcon
              status={properties.status}
              entityName={"ski area"}
              hideIfOperating={false}
            />
          </Typography>
        </InfoHeader>
        {properties.statistics && (
          <SkiAreaStatistics statistics={properties.statistics} />
        )}
      </CardContent>
      {skimapOrgSource && (
        <CardActions>
          <Button
            size="small"
            color="primary"
            target="_blank"
            href={"https://skimap.org/SkiAreas/view/" + skimapOrgSource.id}
          >
            See Paper Maps
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

const GeneratedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  const properties = props.feature.properties;
  return (
    <Card>
      <CardContent>
        <InfoHeader onClose={props.eventBus.hideInfo}>
          <Typography gutterBottom variant="h5" component="h2">
            {activitySummary(properties)}{" "}
            <Tooltip
              placement="right"
              title="This ski area information is generated from OpenStreetMap data"
            >
              <WarningIcon
                fontSize="inherit"
                style={{ verticalAlign: "text-top" }}
              />
            </Tooltip>
          </Typography>
        </InfoHeader>
        {properties.statistics && (
          <SkiAreaStatistics statistics={properties.statistics} />
        )}
      </CardContent>
    </Card>
  );
};

export const SkiAreaInfo: React.SFC<SkiAreaPopupProps> = props => {
  const properties = props.feature.properties;
  return properties.generated ? (
    <GeneratedSkiArea {...props} />
  ) : (
    <CrowdsourcedSkiArea {...props} />
  );
};

function activitySummary(properties: SkiAreaProperties) {
  const downhill = properties.activities.includes(Activity.Downhill);
  const nordic = properties.activities.includes(Activity.Nordic);
  if (downhill && nordic) {
    return "Downhill & Nordic Ski Area";
  } else if (downhill) {
    return "Downhill Ski Area";
  } else if (nordic) {
    return "Nordic Ski Area";
  } else {
    return "Ski Area";
  }
}

const SkiAreaStatistics: React.SFC<{ statistics: Statistics }> = props => {
  const activities: Activity[] = [
    Activity.Downhill,
    Activity.Nordic,
    Activity.Backcountry
  ];
  const difficulties: (RunDifficulty | null)[] = [
    RunDifficulty.NOVICE,
    RunDifficulty.EASY,
    RunDifficulty.INTERMEDIATE,
    RunDifficulty.ADVANCED,
    RunDifficulty.EXPERT,
    RunDifficulty.FREERIDE,
    RunDifficulty.EXTREME,
    null
  ];
  const runStatistics: [
    Activity,
    [RunDifficulty | null, number][]
  ][] = activities.flatMap(activity => {
    const statisticsForActivity = props.statistics.runs.byActivity[activity];
    if (statisticsForActivity !== undefined) {
      return [
        [
          activity,
          difficulties.flatMap(difficulty => {
            const statisticsForDifficulty =
              statisticsForActivity.byDifficulty[difficulty || "other"];
            if (statisticsForDifficulty !== undefined) {
              return [[difficulty, statisticsForDifficulty.lengthInKm]];
            }
            return [];
          })
        ]
      ];
    }
    return [];
  });

  return (
    <>
      {runStatistics.map(activityStatistics => {
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
              {": "}
              {roundedTotalKm} km
            </Typography>
            <RunDifficultyBarChart
              activity={activityStatistics[0]}
              totalRunKm={totalRunKm}
              data={activityStatistics[1]}
            />
          </div>
        );
      })}
    </>
  );
};

const RunDifficultyBarChart: React.SFC<{
  activity: Activity;
  totalRunKm: number;
  data: [RunDifficulty | null, number][];
}> = props => {
  const parts = props.data.map(d => {
    const percentage = (d[1] / props.totalRunKm) * 100.0;
    const difficulty = d[0];

    return (
      <span
        key={difficulty || "other"}
        style={{
          width: percentage + "%",
          backgroundColor: getRunColor(RunConvention.JAPAN, difficulty)
        }}
      ></span>
    );
  });

  return (
    <div style={{ display: "flex", height: "10px", marginBottom: "12px" }}>
      {parts}
    </div>
  );
};
