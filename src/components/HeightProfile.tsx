import turfLineSliceAlong from "@turf/line-slice-along";
import turfNearestPointOnLine from "@turf/nearest-point-on-line";
import memoize from "memoize-one";
import * as React from "react";
import { Line } from "react-chartjs-2";
import "whatwg-fetch";
import { ElevationData } from "./ElevationProfileLoader";

export interface HeightProfileHighlightProps {
  chartHighlightPosition: mapboxgl.LngLatLike | null;
  onHoverChartPosition: (position: mapboxgl.LngLatLike | null) => void;
}

interface HeightProfileProps extends HeightProfileHighlightProps {
  feature: any;
  distance: number;
  elevationData: ElevationData;
}

export class HeightProfile extends React.Component<
  HeightProfileProps,
  { LineChart: typeof Line | null }
> {
  convertedChartHighlightPosition = memoize(convertChartHighlightPosition);

  constructor(props: HeightProfileProps) {
    super(props);

    this.state = {
      LineChart: null
    };
  }

  componentDidMount() {
    import("react-chartjs-2").then(module =>
      this.setState({ LineChart: module.Line })
    );
  }

  onHover(chart: Chart, event: MouseEvent, activeElements: Array<{}>): any {
    let area = chart.chartArea;
    if (area === undefined) {
      this.props.onHoverChartPosition(null);
      return;
    }
    let left = area.left;
    let right = area.right;
    let x = event.offsetX;
    if (x < left || x > right) {
      this.props.onHoverChartPosition(null);
      return;
    }

    let y = event.offsetY;
    if (y > area.bottom || y < area.top) {
      this.props.onHoverChartPosition(null);
      return;
    }

    let position = ((x - left) / (right - left)) * this.props.distance;
    let line = turfLineSliceAlong(this.props.feature, position, position, {
      units: "meters"
    });
    let geometry = line.geometry;
    if (geometry === null) {
      this.props.onHoverChartPosition(null);
      return;
    }

    this.props.onHoverChartPosition(geometry.coordinates[0]);
  }

  render() {
    const LineChart = this.state.LineChart;
    const feature = this.props.feature;
    const elevationData = this.props.elevationData;

    if (LineChart === null || elevationData === null) {
      return null;
    }

    const highlightIndex = this.convertedChartHighlightPosition(
      this.props.chartHighlightPosition,
      feature
    );
    const elevations = elevationData.coordinatesWithElevation.map(
      coordinate => {
        return coordinate[2];
      }
    );

    const data = {
      labels: chartLabels(elevations, elevationData.heightProfileResolution),
      datasets: [
        {
          fill: true,
          lineTension: 0.1,
          backgroundColor: "rgba(75,192,192,0.4)",
          borderColor: "rgba(75,192,192,1)",
          borderCapStyle: "butt" as "butt" | "round" | "square" | undefined,
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter" as "round" | "miter" | "bevel" | undefined,
          pointBorderColor: "rgba(75,192,192,1)",
          pointBackgroundColor: "#fff",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgba(75,192,192,1)",
          pointHoverBorderColor: "rgba(220,220,220,1)",
          pointHoverBorderWidth: 2,
          pointRadius: pointRadiusesWithHighlightAt(
            highlightIndex,
            elevations.length
          ),
          pointHitRadius: 10,
          data: elevations
        }
      ]
    };

    let that = this;
    return (
      <div className="height-profile">
        <LineChart
          data={element => data}
          options={{
            legend: {
              display: false
            },
            animation: {
              duration: 0 // general animation time
            },
            tooltips: {
              enabled: false
            },
            scales: {
              yAxes: [
                {
                  ticks: {
                    callback: elevation => {
                      return elevation + "m";
                    }
                  }
                }
              ]
            },
            onHover: function(
              this: Chart,
              event: MouseEvent,
              activeElements: Array<{}>
            ): any {
              that.onHover(this, event, activeElements);
            }
          }}
        />
      </div>
    );
  }
}

export const HeightProfilePlaceholder: React.SFC = () => {
  return (
    <div className={"height-profile"}>
      <div className={"lds-ring"}>
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>
  );
};

function chartLabels(elevations: number[], heightProfileResolution: number) {
  let distance = 0;
  const labels = [];
  for (let _ of elevations) {
    labels.push((distance / 1000).toFixed(2) + " km");
    distance += heightProfileResolution;
  }
  return labels;
}

function pointRadiusesWithHighlightAt(index: number | null, length: number) {
  const radiuses = Array.apply(null, Array(length)).map(
    Number.prototype.valueOf,
    1
  );
  if (index !== null) {
    radiuses[index] = 5;
  }
  return radiuses;
}

function convertChartHighlightPosition(
  chartHighlightPosition: mapboxgl.LngLatLike | null,
  feature: any
) {
  if (
    chartHighlightPosition === null ||
    feature === null ||
    feature.geometry.type !== "LineString"
  ) {
    return null;
  }

  if (chartHighlightPosition instanceof mapboxgl.LngLat) {
    chartHighlightPosition = chartHighlightPosition.toArray();
  }

  const point = turfNearestPointOnLine(feature, chartHighlightPosition, {
    units: "meters"
  });

  let index = point.properties.index;
  if (index !== undefined) {
    return index / 2;
  } else {
    return null;
  }
}
