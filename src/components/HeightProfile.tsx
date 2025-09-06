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
  RunUse,
  SlopeGradingScale,
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

interface HeightProfileState {
  LineChart: typeof Line | null;
  chartHighlightPosition: maplibregl.LngLat | null;
}

export class HeightProfile extends React.Component<
  HeightProfileProps,
  HeightProfileState
> {
  private marker: maplibregl.Marker | null = null;

  convertedChartHighlightPosition = memoize(
    (
      chartHighlightPosition: maplibregl.LngLat | null,
      elevationProfileGeometry: GeoJSON.LineString
    ) => {
      return this.convertChartHighlightPosition(
        chartHighlightPosition,
        elevationProfileGeometry
      );
    }
  );

  // Memoized function to calculate raw elevation and distance data points
  calculateRawElevationsAndDistance = memoize(
    (profileGeometry: GeoJSON.LineString) => {
      return profileGeometry.coordinates.reduce(
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
    }
  );

  // Memoized function to calculate smoothed elevation and distance data points
  calculateSmoothedElevationsAndDistance = memoize(
    (rawElevationsAndDistance: { x: number; y: number }[]) => {
      if (rawElevationsAndDistance.length === 0) return [];
      
      // Calculate the total distance
      const totalRawDistance = rawElevationsAndDistance[rawElevationsAndDistance.length - 1].x;
      
      // Generate smoothed profile with uniform spacing for a cleaner visualization
      const targetResolution = Math.max(10, Math.min(50, totalRawDistance / 25)); // Target points every ~50m, and min 25 points
      const elevationsAndDistance: { x: number; y: number }[] = [];
      
      // Use a moving average to smooth elevation data
      const windowSize = 3; // Window size for moving average
      
      // Create evenly spaced points along the line
      const numPoints = Math.ceil(totalRawDistance / targetResolution);
      for (let i = 0; i <= numPoints; i++) {
        const distance = (i / numPoints) * totalRawDistance;
        const elevation = getSmoothedElevation(
          rawElevationsAndDistance,
          distance,
          windowSize
        );
        elevationsAndDistance.push({ x: distance, y: elevation });
      }
      
      return elevationsAndDistance;
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
  _onMapMouseMove = (e: maplibregl.MapMouseEvent) => {
    this.setChartHighlightPosition(e.lngLat);
  };

  _onMapMouseOut = () => {
    this.setChartHighlightPosition(null);
  };

  setChartHighlightPosition = (position: maplibregl.LngLat | null) => {
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
    this.markPositionOnMap(new maplibregl.LngLat(firstPoint[0], firstPoint[1]));
  }

  // Marker management
  clearMarker = () => {
    if (this.marker !== null) {
      this.marker.remove();
      this.marker = null;
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
    const elevationProfile = feature.properties.elevationProfile;
    const unitSystem = this.props.unitSystem;

    if (
      LineChart === null ||
      elevationData === null ||
      elevationProfile === null
    ) {
      return null;
    }

    // Use memoized functions to calculate elevation data points
    const rawElevationsAndDistance = this.calculateRawElevationsAndDistance(
      elevationData.profileGeometry
    );
    
    // Calculate smoothed elevation data points
    const elevationsAndDistance = this.calculateSmoothedElevationsAndDistance(
      rawElevationsAndDistance
    );
    
    // Get the total distance for chart configuration
    const totalRawDistance = rawElevationsAndDistance.length > 0 ? 
      rawElevationsAndDistance[rawElevationsAndDistance.length - 1].x : 0;

    // Note that this is the un-inclined distance used for the x-axis, unlike what we show in the stats section.
    const distance = totalRawDistance;

    // Convert the highlight position to a distance along the line
    const highlightPositionX = this.convertedChartHighlightPosition(
      this.state.chartHighlightPosition,
      elevationData.profileGeometry
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

          // Use the smoothed elevation data to configure the gradient
          const chartData = chart.data.datasets[0].data as {
            x: number;
            y: number;
          }[];

          dataset.backgroundColor = configureChartGradient(
            feature,
            chartData,
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
    chartHighlightPosition: maplibregl.LngLat | null,
    elevationProfileGeometry: GeoJSON.LineString
  ) => {
    if (chartHighlightPosition === null) {
      return null;
    }

    const point = turfNearestPointOnLine(
      elevationProfileGeometry,
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
    this.markPositionOnMap(new maplibregl.LngLat(coords[0], coords[1]));

    // Return the distance along the line in meters
    return point.properties.location;
  };
}

function configureChartGradient(
  feature: RunFeature,
  elevationsAndDistance: { x: number; y: number }[],
  gradient: CanvasGradient
): CanvasGradient {
  const difficultyScheme = getSlopeGradingScale(feature);

  // Verify we have enough elevation data
  if (!elevationsAndDistance || elevationsAndDistance.length < 2) {
    // Not enough data, use default difficulty color
    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, null),
      0.7
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
    return gradient;
  }

  // Get total distance from the last point
  const totalDistance =
    elevationsAndDistance[elevationsAndDistance.length - 1].x;
  if (totalDistance === 0) {
    // Zero-length path, use default color
    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, null),
      0.7
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
    return gradient;
  }

  // Calculate difficulties directly from the smoothed data
  const samples: Array<{
    distanceRatio: number;
    difficulty: RunDifficulty;
  }> = [];

  // Since data is already smoothed, we can calculate slope between adjacent points
  for (let i = 0; i < elevationsAndDistance.length - 1; i++) {
    const current = elevationsAndDistance[i];
    const next = elevationsAndDistance[i + 1];

    // Calculate horizontal distance between points
    const horizontalDistance = next.x - current.x;
    if (horizontalDistance <= 0) continue; // Skip invalid segments

    // Calculate elevation change (downhill is positive for steepness calculation)
    const elevationChange = current.y - next.y;

    // Calculate steepness
    const steepness = elevationChange / horizontalDistance;

    // Get difficulty based on steepness
    let difficulty = defaultDifficulty;
    const calculatedDifficulty = getEstimatedRunDifficulty(
      steepness,
      difficultyScheme
    );
    if (calculatedDifficulty !== null) {
      difficulty = calculatedDifficulty;
    }

    // Add sample at the current point
    samples.push({
      distanceRatio: current.x / totalDistance,
      difficulty,
    });

    // Add the last point with the same difficulty as the last segment
    if (i === elevationsAndDistance.length - 2) {
      samples.push({
        distanceRatio: 1,
        difficulty,
      });
    }
  }

  // Add color stops for the gradient
  if (samples.length > 0) {
    // Track current difficulty to only add stops at transition points
    let currentDifficulty = samples[0].difficulty;

    // Add first color stop
    gradient.addColorStop(
      0,
      hsla(
        getRunColor(feature.properties.difficultyConvention, currentDifficulty),
        0.7
      )
    );

    // Add color stops only at transition points
    for (let i = 1; i < samples.length; i++) {
      if (samples[i].difficulty !== currentDifficulty) {
        // Add a small transition for smoother gradient appearance
        gradient.addColorStop(
          samples[i].distanceRatio - 0.001,
          hsla(
            getRunColor(
              feature.properties.difficultyConvention,
              currentDifficulty
            ),
            0.7
          )
        );

        // Update current difficulty
        currentDifficulty = samples[i].difficulty;

        // Add color stop at new difficulty
        gradient.addColorStop(
          samples[i].distanceRatio,
          hsla(
            getRunColor(
              feature.properties.difficultyConvention,
              currentDifficulty
            ),
            0.7
          )
        );
      }
    }

    // Ensure last color stop is at the end
    gradient.addColorStop(
      1,
      hsla(
        getRunColor(feature.properties.difficultyConvention, currentDifficulty),
        0.7
      )
    );
  } else {
    // Fallback if no segments could be calculated
    const color = hsla(
      getRunColor(feature.properties.difficultyConvention, defaultDifficulty),
      0.7
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);
  }

  return gradient;
}

function hsla(hsl: string, amount: number) {
  const result = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hsl);
  if (result === null) {
    throw "Unsupported HSL input: " + hsl;
  }

  return `hsl(${result[1]}, ${result[2]}%, ${result[3]}%, ${amount})`;
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

// Get smoothed elevation using moving average window
function getSmoothedElevation(
  rawData: { x: number; y: number }[],
  distance: number,
  windowSize: number = 3
): number {
  if (rawData.length === 0) return 0;
  if (rawData.length === 1) return rawData[0].y;

  // First get the interpolated value at the exact distance
  const interpolatedValue = getInterpolatedElevation(rawData, distance);

  // If we're at the edges, just return the interpolated value
  if (
    distance <= rawData[0].x + windowSize ||
    distance >= rawData[rawData.length - 1].x - windowSize
  ) {
    return interpolatedValue;
  }

  // Find nearby points within our window to compute moving average
  const windowWidth = windowSize * 2; // Window in meters
  const lowerBound = distance - windowWidth / 2;
  const upperBound = distance + windowWidth / 2;

  // Calculate weighted moving average based on distance
  let weightedSum = 0;
  let weightSum = 0;

  // Find all raw data points within our window
  for (let i = 0; i < rawData.length; i++) {
    const point = rawData[i];
    if (point.x >= lowerBound && point.x <= upperBound) {
      // Calculate weight based on distance (closer points have higher weight)
      const distanceToPoint = Math.abs(point.x - distance);
      const weight = 1 / (1 + distanceToPoint);

      weightedSum += point.y * weight;
      weightSum += weight;
    }
  }

  // If we found points in our window, return the weighted average
  if (weightSum > 0) {
    return weightedSum / weightSum;
  }

  // Fallback to just the interpolated value
  return interpolatedValue;
}
