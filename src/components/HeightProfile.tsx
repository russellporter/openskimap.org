import turfDistance from "@turf/distance";
import turfLineSliceAlong from "@turf/line-slice-along";
import turfNearestPointOnLine from "@turf/nearest-point-on-line";
import {
  CategoryScale,
  Chart,
  ChartData,
  ChartEvent,
  Filler,
  LinearScale,
  LineElement,
  Plugin,
  PointElement,
} from "chart.js";
import * as maplibregl from "maplibre-gl";
import memoize from "memoize-one";
import {
  ElevationData,
  getEstimatedRunDifficulty,
  getRunColor,
  getSlopeGradingScale,
  RunDifficulty,
  RunFeature,
  RunProperties,
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
  map?: maplibregl.Map; // Map is optional to allow the component to be used without highlight functionality
}

interface OverlayData {
  elevation: number;
  slopeDegrees: number;
  slopePercent: number;
  pixelX: number;
  pixelY: number;
}

interface HeightProfileState {
  LineChart: typeof Line | null;
  chartHighlightPosition: maplibregl.LngLat | null;
  overlayData: OverlayData | null;
}

interface ElevationDifficultyAndDistance {
  x: number;
  y: number;
  difficulty: RunDifficulty | null;
}

export class HeightProfile extends React.Component<
  HeightProfileProps,
  HeightProfileState
> {
  private marker: maplibregl.Marker | null = null;
  private highlightPixelCoords: { x: number; y: number } | null = null;

  convertedChartHighlightPosition = memoize(
    (
      chartHighlightPosition: maplibregl.LngLat | null,
      elevationProfileGeometry: GeoJSON.LineString,
    ) => {
      return this.convertChartHighlightPosition(
        chartHighlightPosition,
        elevationProfileGeometry,
      );
    },
  );

  // Memoized function to calculate elevation and distance data points,
  // resampled at the elevation profile resolution so no segment is shorter
  // than the resolution (avoids noisy steepness on short segments).
  calculateRawElevationsAndDistance = memoize(
    (profileGeometry: GeoJSON.LineString, resolution: number) => {
      // First compute distances at each geometry coordinate
      const geometryPoints = profileGeometry.coordinates.reduce(
        (result, coord, index, coords) => {
          if (index === 0) {
            result.push({ x: 0, y: coord[2] });
          } else {
            const prevCoord = coords[index - 1];
            const from = [prevCoord[0], prevCoord[1]];
            const to = [coord[0], coord[1]];
            const segmentDistance = turfDistance(from, to, {
              units: "meters",
            });
            const totalDistance = result[index - 1].x + segmentDistance;
            result.push({ x: totalDistance, y: coord[2] });
          }
          return result;
        },
        [] as { x: number; y: number }[],
      );

      if (geometryPoints.length === 0) return [];

      // Resample at the resolution interval
      const totalDistance = geometryPoints[geometryPoints.length - 1].x;
      const numPoints = Math.round(totalDistance / resolution);
      if (numPoints <= 1) return geometryPoints;

      const resampled: { x: number; y: number }[] = [];
      for (let i = 0; i <= numPoints; i++) {
        const distance = (i / numPoints) * totalDistance;
        resampled.push({
          x: distance,
          y: getInterpolatedElevation(geometryPoints, distance),
        });
      }
      return resampled;
    },
  );

  // Memoized function to calculate difficulty per-segment from raw elevation data
  calculateSegmentDifficulties = memoize(
    (
      rawElevationsAndDistance: { x: number; y: number }[],
      feature: RunFeature,
    ): ElevationDifficultyAndDistance[] => {
      if (rawElevationsAndDistance.length === 0) return [];

      const difficultyScheme = getSlopeGradingScale(feature);
      const result: ElevationDifficultyAndDistance[] = [];

      for (let i = 0; i < rawElevationsAndDistance.length; i++) {
        const current = rawElevationsAndDistance[i];
        let difficulty: RunDifficulty | null = null;

        if (i < rawElevationsAndDistance.length - 1) {
          const next = rawElevationsAndDistance[i + 1];
          const horizontalDistance = next.x - current.x;
          if (horizontalDistance > 0) {
            const steepness = (current.y - next.y) / horizontalDistance;
            difficulty = getEstimatedRunDifficulty(steepness, difficultyScheme);
          }
        } else if (result.length > 0) {
          // Last point inherits difficulty from previous segment
          difficulty = result[result.length - 1].difficulty;
        }

        result.push({ x: current.x, y: current.y, difficulty });
      }

      return result;
    },
  );

  constructor(props: HeightProfileProps) {
    super(props);

    this.state = {
      LineChart: null,
      chartHighlightPosition: null,
      overlayData: null,
    };
  }

  componentDidMount() {
    import("react-chartjs-2").then((module) =>
      this.setState({ LineChart: module.Line }),
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
  _onMapMouseMove = (e: maplibregl.MapMouseEvent) => {
    this.setChartHighlightPosition(e.lngLat);
  };

  _onMapMouseOut = () => {
    this.setChartHighlightPosition(null);
  };

  setChartHighlightPosition = (position: maplibregl.LngLat | null) => {
    this.setState({ chartHighlightPosition: position });
  };

  onHover(
    event: ChartEvent,
    chart: Chart,
    distance: number,
    rawElevationsAndDistance: { x: number; y: number }[],
  ): any {
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
      },
    );
    let geometry = line.geometry;
    if (geometry === null) {
      this.clearMarker();
      return;
    }

    const firstPoint = geometry.coordinates[0];
    this.markPositionOnMap(new maplibregl.LngLat(firstPoint[0], firstPoint[1]));

    const elevation = getInterpolatedElevation(
      rawElevationsAndDistance,
      position,
    );
    const slope = getInterpolatedSlope(rawElevationsAndDistance, position);
    this.setState({
      overlayData: {
        elevation,
        slopeDegrees: slope.degrees,
        slopePercent: slope.percent,
        pixelX: x!,
        pixelY: y!,
      },
    });
  }

  // Marker management
  clearMarker = () => {
    if (this.marker !== null) {
      this.marker.remove();
      this.marker = null;
    }
    if (this.state.overlayData !== null) {
      this.setState({ overlayData: null });
    }
  };

  markPositionOnMap = (position: maplibregl.LngLat | null) => {
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

      this.marker = new maplibregl.Marker({
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
    const unitSystem = this.props.unitSystem;

    if (LineChart === null || elevationData === null) {
      return null;
    }

    // Use memoized functions to calculate elevation data points
    const rawElevationsAndDistance = this.calculateRawElevationsAndDistance(
      elevationData.profileGeometry,
      feature.properties.elevationProfile!.resolution,
    );

    // Calculate difficulty from raw data, then smooth preserving higher difficulty
    const rawDifficulties = this.calculateSegmentDifficulties(
      rawElevationsAndDistance,
      feature as RunFeature,
    );
    const smoothedDifficulties = smoothDifficulties(rawDifficulties);

    // Get the total distance for chart configuration
    const totalRawDistance =
      rawElevationsAndDistance.length > 0
        ? rawElevationsAndDistance[rawElevationsAndDistance.length - 1].x
        : 0;

    // Note that this is the un-inclined distance used for the x-axis, unlike what we show in the stats section.
    const distance = totalRawDistance;

    // Convert the highlight position to a distance along the line
    const highlightPositionX = this.convertedChartHighlightPosition(
      this.state.chartHighlightPosition,
      elevationData.profileGeometry,
    );

    const data: ChartData<"line", { x: number; y: number }[]> = {
      datasets: [
        {
          fill: true,
          borderWidth: 2,
          borderColor: "rgba(0, 0, 0, 0.15)",
          tension: 0.3, // Add bezier curve tension for smoothing
          // Don't show points on the line, we add our own through a plugin
          pointRadius: 0,
          pointHitRadius: 5,
          pointHoverRadius: 0,
          // Set z-index (higher number = lower in stack)
          order: 10,
          data: rawElevationsAndDistance,
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
                      rawElevationsAndDistance,
                      highlightPositionX,
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

              // Store pixel coords for overlay positioning
              that.highlightPixelCoords = { x: point.x, y: point.y };

              // Hide the original point
              point.options.radius = 0;
            }
          } else {
            that.highlightPixelCoords = null;
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
            smoothedDifficulties,
            gradientFill,
          );

          chart.update();
        },
      },
    ];

    // Compute overlay data for map-hover highlights
    let mapHoverOverlay: OverlayData | null = null;
    if (
      highlightPositionX !== null &&
      this.highlightPixelCoords !== null
    ) {
      const elevation = getInterpolatedElevation(
        rawElevationsAndDistance,
        highlightPositionX,
      );
      const slope = getInterpolatedSlope(
        rawElevationsAndDistance,
        highlightPositionX,
      );
      mapHoverOverlay = {
        elevation,
        slopeDegrees: slope.degrees,
        slopePercent: slope.percent,
        pixelX: this.highlightPixelCoords.x,
        pixelY: this.highlightPixelCoords.y,
      };
    }

    // Use chart-hover overlay if available, otherwise map-hover overlay
    const overlayData = this.state.overlayData ?? mapHoverOverlay;

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
            elements: {
              line: {
                tension: 0.3, // Bezier curve tension factor (0=straight lines, 1=maximum curves)
              },
              point: {
                radius: 0, // Don't show points by default
              },
            },
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
                grid: {
                  display: true,
                  color: "rgba(0,0,0,0.05)",
                },
                ticks: {
                  maxRotation: 0, // Keep labels horizontal
                  autoSkipPadding: 20, // Ensure labels don't overlap
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
                grid: {
                  display: true,
                  color: "rgba(0,0,0,0.05)",
                },
                ticks: {
                  callback: (elevation: any) => {
                    return UnitHelpers.heightText(
                      elevation,
                      this.props.unitSystem,
                    );
                  },
                },
              },
            },
            onHover: function (event, _, chart): any {
              that.onHover(event, chart, distance, rawElevationsAndDistance);
            },
          }}
        />
        {overlayData && (
          <div
            className="height-profile-overlay"
            style={{
              left:
                overlayData.pixelX > 200
                  ? overlayData.pixelX - 10
                  : overlayData.pixelX + 10,
              top: overlayData.pixelY - 40,
              transform:
                overlayData.pixelX > 200
                  ? "translateX(-100%)"
                  : "translateX(0)",
            }}
          >
            <div>
              {UnitHelpers.heightText(
                overlayData.elevation,
                unitSystem,
                true,
              )}
            </div>
            <div>
              {Math.round(overlayData.slopeDegrees)}°{" "}
              ({Math.round(overlayData.slopePercent)}%)
            </div>
          </div>
        )}
      </div>
    );
  }

  convertChartHighlightPosition = (
    chartHighlightPosition: maplibregl.LngLat | null,
    elevationProfileGeometry: GeoJSON.LineString,
  ) => {
    if (chartHighlightPosition === null) {
      return null;
    }

    const point = turfNearestPointOnLine(
      elevationProfileGeometry,
      [chartHighlightPosition.lng, chartHighlightPosition.lat],
      {
        units: "meters",
      },
    );

    // Only show the highlight if the cursor is within 200 meters of the run
    const distanceToLine = point.properties.dist;
    if (distanceToLine > 200) {
      this.clearMarker();
      return null;
    }

    // Show the point on the map as well
    const coords = point.geometry.coordinates;
    this.markPositionOnMap(new maplibregl.LngLat(coords[0], coords[1]));

    // Return the distance along the line in meters
    return point.properties.location;
  };
}

function difficultyRank(difficulty: RunDifficulty | null): number {
  if (difficulty === null) return 0;
  switch (difficulty) {
    case RunDifficulty.NOVICE:
      return 1;
    case RunDifficulty.EASY:
      return 2;
    case RunDifficulty.INTERMEDIATE:
      return 3;
    case RunDifficulty.ADVANCED:
      return 4;
    case RunDifficulty.EXPERT:
      return 5;
    case RunDifficulty.FREERIDE:
      return 6;
    case RunDifficulty.EXTREME:
      return 7;
  }
}

function smoothDifficulties(
  points: ElevationDifficultyAndDistance[],
  maxPoints: number = 50,
): ElevationDifficultyAndDistance[] {
  let result = points;
  while (result.length > maxPoints) {
    result = halveDifficultyPoints(result);
  }
  return result;
}

function halveDifficultyPoints(
  points: ElevationDifficultyAndDistance[],
): ElevationDifficultyAndDistance[] {
  const result: ElevationDifficultyAndDistance[] = [];

  for (let i = 0; i < points.length - 1; i += 2) {
    const a = points[i];
    const b = points[i + 1];
    const difficulty =
      difficultyRank(a.difficulty) >= difficultyRank(b.difficulty)
        ? a.difficulty
        : b.difficulty;
    result.push({ x: a.x, y: a.y, difficulty });
  }

  // Always preserve the last point for full distance range
  // (if odd, the last point wasn't paired; if even, the last pair
  // only kept the first element, so we still need the final point)
  if (
    result.length === 0 ||
    result[result.length - 1] !== points[points.length - 1]
  ) {
    result.push(points[points.length - 1]);
  }

  return result;
}

function configureChartGradient(
  feature: RunFeature,
  difficulties: ElevationDifficultyAndDistance[],
  gradient: CanvasGradient,
): CanvasGradient {
  if (!difficulties || difficulties.length < 2) {
    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, null),
      0.7,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
    return gradient;
  }

  const totalDistance = difficulties[difficulties.length - 1].x;
  if (totalDistance === 0) {
    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, null),
      0.7,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
    return gradient;
  }

  let currentDifficulty = difficulties[0].difficulty;

  gradient.addColorStop(
    0,
    hsla(
      getRunColor(feature.properties.difficultyConvention, currentDifficulty),
      0.7,
    ),
  );

  for (let i = 1; i < difficulties.length; i++) {
    if (difficulties[i].difficulty !== currentDifficulty) {
      const distanceRatio = difficulties[i].x / totalDistance;

      gradient.addColorStop(
        distanceRatio - 0.001,
        hsla(
          getRunColor(
            feature.properties.difficultyConvention,
            currentDifficulty,
          ),
          0.7,
        ),
      );

      currentDifficulty = difficulties[i].difficulty;

      gradient.addColorStop(
        distanceRatio,
        hsla(
          getRunColor(
            feature.properties.difficultyConvention,
            currentDifficulty,
          ),
          0.7,
        ),
      );
    }
  }

  gradient.addColorStop(
    1,
    hsla(
      getRunColor(feature.properties.difficultyConvention, currentDifficulty),
      0.7,
    ),
  );

  return gradient;
}

function hsla(hsl: string, amount: number) {
  const result = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hsl);
  if (result === null) {
    throw "Unsupported HSL input: " + hsl;
  }

  return `hsl(${result[1]}, ${result[2]}%, ${result[3]}%, ${amount})`;
}

// Get the interpolated slope at a given distance along the line
function getInterpolatedSlope(
  elevationsAndDistance: { x: number; y: number }[],
  distance: number,
): { degrees: number; percent: number } {
  if (elevationsAndDistance.length < 2) {
    return { degrees: 0, percent: 0 };
  }

  // Find the segment containing this distance
  let beforeIndex = 0;
  for (let i = 0; i < elevationsAndDistance.length; i++) {
    if (elevationsAndDistance[i].x > distance) {
      break;
    }
    beforeIndex = i;
  }

  // Clamp to valid segment
  if (beforeIndex >= elevationsAndDistance.length - 1) {
    beforeIndex = elevationsAndDistance.length - 2;
  }

  const before = elevationsAndDistance[beforeIndex];
  const after = elevationsAndDistance[beforeIndex + 1];
  const horizontalDistance = after.x - before.x;

  if (horizontalDistance === 0) {
    return { degrees: 0, percent: 0 };
  }

  // Positive steepness = downhill
  const steepness = (before.y - after.y) / horizontalDistance;
  const degrees = Math.atan(Math.abs(steepness)) * (180 / Math.PI);
  const percent = Math.abs(steepness) * 100;

  return { degrees, percent };
}

// Get the interpolated elevation value for a given distance along the line
function getInterpolatedElevation(
  elevationsAndDistance: { x: number; y: number }[],
  distance: number,
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
