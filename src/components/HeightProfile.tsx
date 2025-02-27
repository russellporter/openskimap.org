import turfLineSliceAlong from "@turf/line-slice-along";
import turfNearestPointOnLine from "@turf/nearest-point-on-line";
import {
  CategoryScale,
  Chart,
  ChartData,
  ChartEvent,
  Filler,
  LineElement,
  LinearScale,
  Plugin,
  PointElement,
} from "chart.js";
import * as mapboxgl from "mapbox-gl";
import memoize from "memoize-one";
import {
  ElevationProfile,
  RunDifficulty,
  RunFeature,
  RunProperties,
  RunUse,
  getRunColor,
} from "openskidata-format";
import * as React from "react";
import { Line } from "react-chartjs-2";
import "whatwg-fetch";
import { ElevationData } from "./ElevationData";
import * as UnitHelpers from "./utils/UnitHelpers";

Chart.register(LinearScale);
Chart.register(CategoryScale);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(Filler);

export interface HeightProfileHighlightProps {
  chartHighlightPosition: mapboxgl.LngLat | null;
  onHoverChartPosition: (position: mapboxgl.LngLat | null) => void;
}

interface HeightProfileProps extends HeightProfileHighlightProps {
  feature: GeoJSON.Feature<GeoJSON.LineString, RunProperties>;
  distance: number;
  elevationData: ElevationData;
  unitSystem: UnitHelpers.UnitSystem;
}

export class HeightProfile extends React.Component<
  HeightProfileProps,
  { LineChart: typeof Line | null }
> {
  convertedChartHighlightPosition = memoize(convertChartHighlightPosition);

  constructor(props: HeightProfileProps) {
    super(props);

    this.state = {
      LineChart: null,
    };
  }

  componentDidMount() {
    import("react-chartjs-2").then((module) =>
      this.setState({ LineChart: module.Line })
    );
  }

  onHover(event: ChartEvent, chart: Chart): any {
    let area = chart.chartArea;
    let x = event.x;
    let y = event.y;

    if (x === null || y === null) {
      this.props.onHoverChartPosition(null);
      return;
    }
    let left = area.left;
    let right = area.right;
    if (x < left || x > right) {
      this.props.onHoverChartPosition(null);
      return;
    }

    if (y > area.bottom || y < area.top) {
      this.props.onHoverChartPosition(null);
      return;
    }

    let position = ((x - left) / (right - left)) * this.props.distance;
    let line = turfLineSliceAlong(this.props.feature, position, position, {
      units: "meters",
    });
    let geometry = line.geometry;
    if (geometry === null) {
      this.props.onHoverChartPosition(null);
      return;
    }

    const firstPoint = geometry.coordinates[0];
    this.props.onHoverChartPosition(
      new mapboxgl.LngLat(firstPoint[0], firstPoint[1])
    );
  }

  render() {
    const LineChart = this.state.LineChart;
    const feature = this.props.feature;
    const elevationData = this.props.elevationData;
    const elevationProfile = feature.properties.elevationProfile;

    if (
      LineChart === null ||
      elevationData === null ||
      elevationProfile === null
    ) {
      return null;
    }

    const elevations = elevationData.coordinatesWithElevation.map(
      (coordinate) => {
        return coordinate[2];
      }
    );

    const data: ChartData<"line", number[], string> = {
      labels: chartLabels(
        elevations,
        elevationData.heightProfileResolution,
        this.props.unitSystem
      ),
      datasets: [
        {
          fill: true,
          borderWidth: 0,
          pointRadius: 0,
          data: elevations,
        },
      ],
    };

    const plugins: Plugin[] = [
      {
        id: "gradient",
        beforeRender: function (chart) {
          // Based on https://github.com/chartjs/Chart.js/issues/3071
          const context = chart.ctx;
          const xScale = chart.scales.x;

          if (!xScale || !chart.data.datasets) {
            return;
          }

          const dataset = chart.data.datasets[0];

          // Avoid duplicate work
          if (dataset.backgroundColor instanceof CanvasGradient) {
            return;
          }

          const left = xScale.getPixelForValue(xScale.min);
          const right = xScale.getPixelForValue(xScale.max);

          if (Number.isNaN(left) || Number.isNaN(right)) {
            return;
          }

          const gradientFill = context.createLinearGradient(left, 0, right, 0);

          dataset.backgroundColor = configureChartGradient(
            feature,
            elevationProfile,
            gradientFill
          );

          chart.update();
        },
      },
    ];

    let that = this;
    return (
      <div className="height-profile">
        <Line
          data={data}
          plugins={plugins}
          options={{
            animation: {
              duration: 0, // general animation time
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
              },
            },
            scales: {
              y: {
                type: "linear",
                suggestedMax:
                  Math.max(
                    elevationData.maxElevation - elevationData.minElevation,
                    100
                  ) + elevationData.minElevation,
                ticks: {
                  callback: (elevation: any) => {
                    return UnitHelpers.heightText(
                      elevation,
                      this.props.unitSystem
                    );
                  },
                },
              },
            },
            onHover: function (event, _, chart): any {
              that.onHover(event, chart);
            },
          }}
        />
      </div>
    );
  }
}

function chartLabels(
  elevations: number[],
  heightProfileResolution: number,
  unitSystem: UnitHelpers.UnitSystem
) {
  let distance = 0;
  const labels = [];
  for (let _ of elevations) {
    labels.push(
      UnitHelpers.distanceText({
        distanceInMeters: distance,
        unitSystem,
        forceLongestUnit: true,
        withSpace: true,
      })
    );
    distance += heightProfileResolution;
  }
  return labels;
}

function configureChartGradient(
  feature: RunFeature,
  elevationProfile: ElevationProfile,
  gradient: CanvasGradient
): CanvasGradient {
  const difficultyScheme = getRunDifficultyScheme(feature);
  const elevations = elevationProfile.heights;
  const stopInterval = 1 / elevations.length;
  const stopSize = 5;
  elevations.forEach((elevation, index) => {
    if (index < stopSize) {
      return;
    }

    const steepness =
      (elevations[index - stopSize] - elevation) /
      (elevationProfile.resolution * stopSize);
    const difficulty =
      getEstimatedRunDifficulty(steepness, difficultyScheme) ||
      feature.properties.difficulty;

    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, difficulty),
      0.7
    );
    const middleIndex = index - stopSize / 2;
    gradient.addColorStop(
      stopInterval * (middleIndex - 0.5) + Number.EPSILON,
      color
    );
    gradient.addColorStop(
      stopInterval * (middleIndex + 0.5) - Number.EPSILON,
      color
    );
  });
  return gradient;
}

function hsla(hsl: string, amount: number) {
  const result = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hsl);
  if (result === null) {
    throw "Unsupported HSL input: " + hsl;
  }

  return `hsl(${result[1]}, ${result[2]}%, ${result[3]}%, ${amount})`;
}

type RunDifficultyScheme = {
  // Stops must be ordered ascending by steepness
  stops: { maxSteepness: number; difficulty: RunDifficulty }[];
};

function getRunDifficultyScheme(feature: RunFeature) {
  if (
    feature.properties.uses.includes(RunUse.Downhill) ||
    feature.properties.uses.includes(RunUse.Skitour)
  ) {
    return {
      stops: [
        { maxSteepness: 0.25, difficulty: RunDifficulty.EASY },
        { maxSteepness: 0.4, difficulty: RunDifficulty.INTERMEDIATE },
        { maxSteepness: Number.MAX_VALUE, difficulty: RunDifficulty.ADVANCED },
      ],
    };
  } else if (feature.properties.uses.includes(RunUse.Nordic)) {
    return {
      stops: [
        { maxSteepness: 0.1, difficulty: RunDifficulty.EASY },
        { maxSteepness: 0.15, difficulty: RunDifficulty.INTERMEDIATE },
        { maxSteepness: Number.MAX_VALUE, difficulty: RunDifficulty.ADVANCED },
      ],
    };
  } else {
    return { stops: [] };
  }
}

function getEstimatedRunDifficulty(
  steepness: number,
  scheme: RunDifficultyScheme
): RunDifficulty | null {
  const absoluteSteepness = Math.abs(steepness);
  return (
    scheme.stops.find((stop) => stop.maxSteepness > absoluteSteepness)
      ?.difficulty || null
  );
}

function convertChartHighlightPosition(
  chartHighlightPosition: mapboxgl.LngLat | null,
  feature: any
) {
  if (
    chartHighlightPosition === null ||
    feature === null ||
    feature.geometry.type !== "LineString"
  ) {
    return null;
  }

  const point = turfNearestPointOnLine(
    feature,
    [chartHighlightPosition.lng, chartHighlightPosition.lat],
    {
      units: "meters",
    }
  );

  let index = point.properties.index;
  if (index !== undefined) {
    return index / 2;
  } else {
    return null;
  }
}
