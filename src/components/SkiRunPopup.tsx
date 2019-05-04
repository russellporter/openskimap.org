import { Card, CardContent, Typography } from "@material-ui/core";
import turfLength from "@turf/length";
import { Feature, Geometry } from "geojson";
import * as React from "react";
import loadElevationProfile, {
  ElevationData,
  extractPoints
} from "./ElevationProfileLoader";
import { loadRun } from "./GeoJSONLoader";
import {
  HeightProfile,
  HeightProfileHighlightProps,
  HeightProfilePlaceholder
} from "./HeightProfile";
import { LabelWithIcon } from "./LabelWithIcon";
import { SkiRunData } from "./MapData";
import { PointPopover } from "./PointPopover";

interface Props extends HeightProfileHighlightProps {
  data: SkiRunData;
}

interface State {
  feature: Feature<Geometry, SkiRunData> | null;
  distance: number | null;
  elevationData: ElevationData | null;
  loadingElevationData: boolean;
}

interface GroomingLabelProps {
  data: SkiRunData;
}

export class SkiRunInfo extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      feature: null,
      distance: null,
      elevationData: null,
      loadingElevationData: true
    };
  }

  componentDidMount() {
    loadRun(this.props.data.lid)
      .then(feature => {
        this.setState({
          feature: feature,
          distance:
            feature.geometry.type === "LineString"
              ? turfLength(feature, { units: "meters" })
              : null
        });
        return feature;
      })
      .then(feature => {
        if (feature.geometry.type === "LineString") {
          return loadElevationProfile(extractPoints(feature));
        }

        return Promise.reject("no elevation profile to load");
      })
      .then(
        elevationData => {
          this.setState({
            elevationData: elevationData,
            loadingElevationData: false
          });
        },
        () => {
          this.setState({ loadingElevationData: false });
        }
      );
  }

  showHeightProfile() {
    return (
      this.state.feature !== null &&
      this.state.feature.geometry.type === "LineString"
    );
  }

  render() {
    const data = this.props.data;
    const type = data["piste:type"];
    const feature = this.state.feature;
    const distance = this.state.distance;
    const elevationData = this.state.elevationData;
    const slopeInfo = elevationData && elevationData.slopeInfo;

    return (
      <Card>
        <CardContent>
          <Typography gutterBottom variant="h5" component="h2">
            {data.name}
          </Typography>
          {difficultyText(data)}
          <div className="ski-popup-labels">
            <GroomingLabel data={data} />
            {data.oneway === "yes" && type !== "downhill" ? (
              <LabelWithIcon
                appearance="info"
                text="One Way"
                icon="arrow-right"
              />
            ) : null}
            {data.lit === "yes" ? (
              <LabelWithIcon
                appearance="night"
                text="Night Lit"
                icon="asterisk"
              />
            ) : null}
            {data.gladed === "yes" ? (
              <LabelWithIcon
                appearance="success"
                text="Gladed"
                icon="tree-conifer"
              />
            ) : null}
            {data.patrolled === "yes" ? (
              <LabelWithIcon appearance="info" text="Patrolled" icon="plus" />
            ) : null}
            {data.patrolled === "no" ? (
              <LabelWithIcon
                appearance="danger"
                text="Not Patrolled"
                icon="plus"
              />
            ) : null}
          </div>
          <div className={"distance-and-elevation-info"}>
            {distance ? <span>Distance: {Math.round(distance)}m</span> : null}
            {elevationData && elevationData.ascent > 1 ? (
              <span>Ascent: {Math.round(elevationData.ascent)}m</span>
            ) : null}
            {elevationData && elevationData.descent > 1 ? (
              <span>Descent: {Math.round(elevationData.descent)}m</span>
            ) : null}
          </div>
          {slopeInfo && (
            <div className={"distance-and-elevation-info"}>
              {slopeInfo.average !== null && (
                <span>Average Slope: {formattedSlope(slopeInfo.average)}</span>
              )}
              {slopeInfo.max !== null && (
                <span>Max Slope: {formattedSlope(slopeInfo.max)}</span>
              )}
            </div>
          )}
          {data.note !== undefined && (
            <div>
              <span>Notes: {data.note}</span>
            </div>
          )}
          {feature !== null &&
          distance !== null &&
          elevationData !== null &&
          this.showHeightProfile() ? (
            <HeightProfile
              feature={feature}
              distance={distance}
              elevationData={elevationData}
              chartHighlightPosition={this.props.chartHighlightPosition}
              onHoverChartPosition={this.props.onHoverChartPosition}
            />
          ) : this.state.loadingElevationData ? (
            <HeightProfilePlaceholder />
          ) : null}
        </CardContent>
      </Card>
    );
  }
}

const GroomingLabel: React.SFC<GroomingLabelProps> = props => {
  const grooming = props.data["piste:grooming"];
  const type = props.data["piste:type"];

  let appearance;
  let text;
  switch (grooming) {
    case "classic":
      appearance = "primary";
      text = type === "nordic" ? "Classic" : "Groomed";
      break;
    case "skating":
      appearance = "primary";
      text = "Skate";
      break;
    case "classic;skating":
    case "classic+skating":
      appearance = "primary";
      text = "Classic & Skate";
      break;
    case "mogul":
      appearance = "warning";
      text = "Moguls";
      break;
    case "scooter":
      appearance = "primary";
      text = type === "nordic" ? "Classic (narrow)" : "Groomed (narrow)";
      break;
    case "backcountry":
      appearance = "warning";
      text = "Ungroomed";
      break;
    default:
      return null;
  }

  return <LabelWithIcon appearance={appearance} text={text} />;
};

function formattedType(type: string) {
  const subTypes = type.split(";");
  const formattedTypes = subTypes.map(value => {
    switch (value.trim()) {
      case "downhill":
        return "Downhill ski run";
      case "nordic":
        return "Nordic ski trail";
      case "skitour":
        return "Ski touring route";
      case "sled":
        return "Sledding trail";
      case "hike":
        return "Hiking trail";
      case "sleigh":
        return "Sleigh route";
      case "ice_skate":
        return "Ice skating route";
      case "snow_park":
        return "Terrain park";
      case "playground":
        return "Ski playground";
      case "ski_jump":
        return "Ski jump";
      default:
        return null;
    }
  });
  return formattedTypes.join(", ");
}

function formattedSlope(slopePercent: number) {
  const percent = Math.round(Math.abs(slopePercent * 100)) + "%";
  const degrees =
    Math.round(Math.abs((Math.atan(slopePercent) / Math.PI) * 180)) + "°";
  return degrees + " (" + percent + ")";
}

function difficultyText(data: SkiRunData) {
  let difficulty = data["piste:difficulty"];
  if (difficulty) {
    difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }
  const type = formattedType(data["piste:type"]);
  if (difficulty && type) {
    return difficulty + " " + type.toLowerCase();
  } else if (difficulty) {
    return difficulty;
  } else {
    return type;
  }
}

export class SkiRunPopover extends PointPopover {
  private data: SkiRunData;

  constructor(position: mapboxgl.LngLatLike, data: SkiRunData) {
    super(position);
    this.data = data;
  }

  public addTo(map: mapboxgl.Map) {
    super.addTo(map);

    map.setFilter("selected-run", ["==", "lid", this.data.lid]);
  }

  public remove(map: mapboxgl.Map) {
    super.remove(map);

    map.setFilter("selected-run", ["==", "lid", -1]);
  }

  protected render(): React.ReactElement<any> {
    return (
      <SkiRunInfo
        data={this.data}
        chartHighlightPosition={this.highlightPosition}
        onHoverChartPosition={this._onHoverChartPosition}
      />
    );
  }
}
