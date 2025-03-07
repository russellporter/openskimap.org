import turfDistance from "@turf/distance";
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
  ElevationData,
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
import * as UnitHelpers from "./utils/UnitHelpers";

Chart.register(LinearScale);
Chart.register(CategoryScale);
Chart.register(PointElement);
Chart.register(LineElement);
Chart.register(Filler);

export interface HeightProfileProps {
  feature: GeoJSON.Feature<GeoJSON.LineString, RunProperties>;
  elevationData: ElevationData;
  unitSystem: UnitHelpers.UnitSystem;
  map?: mapboxgl.Map; // Map is optional to allow the component to be used without highlight functionality
}

interface HeightProfileState {
  LineChart: typeof Line | null;
  chartHighlightPosition: mapboxgl.LngLat | null;
}

export class HeightProfile extends React.Component<
  HeightProfileProps,
  HeightProfileState
> {
  private marker: mapboxgl.Marker | null = null;

  convertedChartHighlightPosition = memoize(
    (chartHighlightPosition: mapboxgl.LngLat | null, feature: any) => {
      return this.convertChartHighlightPosition(
        chartHighlightPosition,
        feature
      );
    }
  );

  constructor(props: HeightProfileProps) {
    super(props);

    this.state = {
      LineChart: null,
      chartHighlightPosition: null,
    };
  }

  componentDidMount() {
    import("react-chartjs-2").then((module) =>
      this.setState({ LineChart: module.Line })
    );

    // Set up map event listeners if map is provided
    if (this.props.map) {
      this.props.map.on("mousemove", this._onMapMouseMove);
      this.props.map.on("mouseout", this._onMapMouseOut);
    }
  }

  componentDidUpdate(prevProps: HeightProfileProps) {
    // Handle map reference changes
    if (prevProps.map !== this.props.map) {
      if (prevProps.map) {
        prevProps.map.off("mousemove", this._onMapMouseMove);
        prevProps.map.off("mouseout", this._onMapMouseOut);
      }

      if (this.props.map) {
        this.props.map.on("mousemove", this._onMapMouseMove);
        this.props.map.on("mouseout", this._onMapMouseOut);
      }
    }
  }

  componentWillUnmount() {
    if (this.props.map) {
      this.props.map.off("mousemove", this._onMapMouseMove);
      this.props.map.off("mouseout", this._onMapMouseOut);
    }

    // Clean up marker
    this.clearMarker();
  }

  // Map event handlers
  _onMapMouseMove = (e: mapboxgl.MapMouseEvent) => {
    this.setChartHighlightPosition(e.lngLat);
  };

  _onMapMouseOut = () => {
    this.setChartHighlightPosition(null);
  };

  setChartHighlightPosition = (position: mapboxgl.LngLat | null) => {
    this.setState({ chartHighlightPosition: position });
  };

  onHover(event: ChartEvent, chart: Chart, distance: number): any {
    let area = chart.chartArea;
    let x = event.x;
    let y = event.y;

    if (x === null || y === null) {
      this.clearMarker();
      return;
    }

    let left = area.left;
    let right = area.right;
    if (x < left || x > right) {
      this.clearMarker();
      return;
    }

    if (y > area.bottom || y < area.top) {
      this.clearMarker();
      return;
    }

    let position = ((x - left) / (right - left)) * distance;
    let line = turfLineSliceAlong(
      this.props.elevationData.profileGeometry,
      position,
      position,
      {
        units: "meters",
      }
    );
    let geometry = line.geometry;
    if (geometry === null) {
      this.clearMarker();
      return;
    }

    const firstPoint = geometry.coordinates[0];
    this.markPositionOnMap(new mapboxgl.LngLat(firstPoint[0], firstPoint[1]));
  }

  // Marker management
  clearMarker = () => {
    if (this.marker !== null) {
      this.marker.remove();
      this.marker = null;
    }
  };

  markPositionOnMap = (position: mapboxgl.LngLat | null) => {
    if (!this.props.map || position === null) {
      this.clearMarker();
      return;
    }

    if (this.marker === null) {
      // Create a custom ring-style marker
      const el = document.createElement("div");
      el.className = "chart-position-marker";
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid #000";
      el.style.backgroundColor = "transparent";

      this.marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat(position)
        .addTo(this.props.map);
    } else {
      this.marker.setLngLat(position);
    }
  };

  render() {
    const LineChart = this.state.LineChart;
    const feature = this.props.feature;
    const elevationData = this.props.elevationData;
    const elevationProfile = feature.properties.elevationProfile;
    const unitSystem = this.props.unitSystem;

    if (
      LineChart === null ||
      elevationData === null ||
      elevationProfile === null
    ) {
      return null;
    }

    // Using turf/distance calculates the distance between each point. Returns an array of elevations by distance along the line
    const elevationsAndDistance =
      elevationData.profileGeometry.coordinates.reduce(
        (result, coord, index, coords) => {
          if (index === 0) {
            // First point has zero distance
            result.push({ x: 0, y: coord[2] });
          } else {
            const prevCoord = coords[index - 1];
            const from = [prevCoord[0], prevCoord[1]];
            const to = [coord[0], coord[1]];
            const segmentDistance = turfDistance(from, to, { units: "meters" });
            const totalDistance = result[index - 1].x + segmentDistance;
            result.push({ x: totalDistance, y: coord[2] });
          }
          return result;
        },
        [] as { x: number; y: number }[]
      );

    // Note that this is the un-inclined distance used for the x-axis, unlike what we show in the stats section.
    const distance = elevationsAndDistance[elevationsAndDistance.length - 1].x;

    // Convert the highlight position to a distance along the line
    const highlightPositionX = this.convertedChartHighlightPosition(
      this.state.chartHighlightPosition,
      feature
    );

    const data: ChartData<"line", { x: number; y: number }[]> = {
      datasets: [
        {
          fill: true,
          borderWidth: 0,
          // Don't show points on the line, we add our own through a plugin
          pointRadius: 0,
          pointHitRadius: 5,
          pointHoverRadius: 0,
          // Set z-index (higher number = lower in stack)
          order: 10,
          data: elevationsAndDistance.map((point) => ({
            x: point.x,
            y: point.y,
          })),
        },
        // Add a second dataset for the highlight point if we have a position
        ...(highlightPositionX !== null
          ? [
              {
                fill: false,
                borderWidth: 0,
                borderColor: "rgba(0, 0, 0, 0)",
                pointRadius: 0,
                pointHitRadius: 16,
                // Set a lower order value to ensure it appears on top (Chart.js renders lower values on top)
                order: 1,
                data: [
                  {
                    x: highlightPositionX,
                    y: getInterpolatedElevation(
                      elevationsAndDistance,
                      highlightPositionX
                    ),
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const plugins: Plugin[] = [
      {
        id: "customPointStyle",
        afterDraw: function (chart) {
          const datasets = chart.data.datasets;
          if (!datasets) return;

          const ctx = chart.ctx;
          const POINT_RADIUS = 8;

          // Helper function to draw a point marker
          const drawPointMarker = (x: number, y: number) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          };

          // Draw hovered point on the chart (first dataset)
          if (chart.getActiveElements().length > 0) {
            const activeElement = chart.getActiveElements()[0];
            if (activeElement.datasetIndex === 0) {
              const meta = chart.getDatasetMeta(0);
              const point = meta.data[activeElement.index];
              if (point) {
                drawPointMarker(point.x, point.y);
              }
            }
          }

          // Draw highlight from map hovering (second dataset)
          if (datasets.length > 1) {
            const meta = chart.getDatasetMeta(1);
            if (meta.data && meta.data.length > 0) {
              const point = meta.data[0];
              drawPointMarker(point.x, point.y);

              // Hide the original point
              point.options.radius = 0;
            }
          }
        },
      },
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
      <div className="height-profile" onMouseLeave={this.clearMarker}>
        <Line
          data={data}
          plugins={plugins}
          options={{
            animation: {
              duration: 0, // general animation time
            },
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
              },
            },
            hover: {
              mode: "index",
              intersect: false,
              includeInvisible: true,
            },
            scales: {
              x: {
                type: "linear",
                min: 0,
                max: distance,
                ticks: {
                  callback: (value: any) => {
                    return UnitHelpers.distanceText({
                      distanceInMeters: value,
                      unitSystem,
                      forceLongestUnit: true,
                      withSpace: true,
                    });
                  },
                },
              },
              y: {
                type: "linear",
                suggestedMax:
                  Math.max(elevationData.verticalInMeters, 100) +
                  elevationData.minElevationInMeters,
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
              that.onHover(event, chart, distance);
            },
          }}
        />
      </div>
    );
  }

  convertChartHighlightPosition = (
    chartHighlightPosition: mapboxgl.LngLat | null,
    feature: any
  ) => {
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

    // Only show the highlight if the cursor is within 200 meters of the run
    const distanceToLine = point.properties.dist;
    if (distanceToLine > 200) {
      this.clearMarker();
      return null;
    }

    // Show the point on the map as well
    const coords = point.geometry.coordinates;
    this.markPositionOnMap(new mapboxgl.LngLat(coords[0], coords[1]));

    // Return the distance along the line in meters
    return point.properties.location;
  };
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

// Get the interpolated elevation value for a given distance along the line
function getInterpolatedElevation(
  elevationsAndDistance: { x: number; y: number }[],
  distance: number
): number {
  // Find the points before and after the target distance
  let beforeIndex = 0;
  for (let i = 0; i < elevationsAndDistance.length; i++) {
    if (elevationsAndDistance[i].x > distance) {
      break;
    }
    beforeIndex = i;
  }

  // If the distance is at or past the end of the line, return the last elevation
  if (beforeIndex === elevationsAndDistance.length - 1) {
    return elevationsAndDistance[beforeIndex].y;
  }

  // Get the points before and after the target distance
  const before = elevationsAndDistance[beforeIndex];
  const after = elevationsAndDistance[beforeIndex + 1];

  // Calculate how far between the two points we are (0-1)
  const ratio = (distance - before.x) / (after.x - before.x);

  // Interpolate the elevation
  return before.y + ratio * (after.y - before.y);
}
