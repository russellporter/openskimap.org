import turfLength from "@turf/length";
import { Feature, Geometry, LineString } from "geojson";
import * as React from "react";
import loadElevationProfile, {
  ElevationData,
  extractEndpoints
} from "./ElevationProfileLoader";
import { loadLift } from "./GeoJSONLoader";
import { SkiLiftData } from "./MapData";
import { PointPopover } from "./PointPopover";
import * as Popup from "./PopupComponents";
import { StatusIcon } from "./StatusIcon";

interface Props {
  data: SkiLiftData;
}

interface State {
  feature: Feature<Geometry, SkiLiftData> | null;
  distance: number | null;
  speed: number | null;
  elevationData: ElevationData | null;
}

export class SkiLiftInfo extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      feature: null,
      distance: null,
      elevationData: null,
      speed: null
    };
  }

  componentDidMount() {
    loadLift(this.props.data.lid)
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
          return loadElevationProfile(
            extractEndpoints(feature.geometry as LineString)
          );
        }

        return Promise.reject("no elevation profile to load");
      })
      .then(elevationData => {
        const elevationChange = Math.max(
          elevationData.ascent,
          elevationData.descent
        );
        const distance = this.state.distance;
        const durationInSeconds = normalizeDuration(
          this.props.data["aerialway:duration"]
        );
        let speed = null;
        if (distance !== null && durationInSeconds !== null) {
          const slopeDistance = Math.sqrt(
            Math.pow(distance, 2) + Math.pow(elevationChange, 2)
          );
          speed = slopeDistance / durationInSeconds;
        }

        this.setState({ elevationData: elevationData, speed: speed });
      });
  }

  render() {
    const data = this.props.data;
    const distance = this.state.distance;
    const elevationData = this.state.elevationData;
    const speed = this.state.speed;
    const badgeProps = Popup.refBadgeFromData(data);
    const badge = badgeProps ? <Popup.Badge {...badgeProps} /> : null;
    return (
      <Popup.Container>
        <Popup.Header>
          {data.name_and_type && <Popup.Title title={data.name_and_type} />}
          {badge && " "}
          {badge && badge}
          {data.status && " "}
          {data.status && (
            <StatusIcon
              status={data.status}
              entityName={"lift"}
              hideIfOperating={true}
            />
          )}
        </Popup.Header>
        {
          <div className={"distance-and-elevation-info"}>
            {distance && <span>Distance: {Math.round(distance)}m</span>}
            {elevationData && elevationData.ascent > 1 && (
              <span>Ascent: {Math.round(elevationData.ascent)}m</span>
            )}
            {elevationData && elevationData.descent > 1 && (
              <span>Descent: {Math.round(elevationData.descent)}m</span>
            )}
            {speed && <span>Speed: {speed.toFixed(1)} m/s</span>}
          </div>
        }
        {data.note && (
          <div>
            <span>Notes: {data.note}</span>
          </div>
        )}
      </Popup.Container>
    );
  }
}

function isNumeric(n: any) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function normalizeDuration(string: string | undefined): number | null {
  if (string === undefined) {
    return null;
  }
  if (isNumeric(string)) {
    return Math.round(parseFloat(string) * 60);
  }

  if (string.indexOf(":") !== -1) {
    const components = string.split(":");
    if (components.length !== 2) {
      return null;
    }

    return parseInt(components[0]) * 60 + parseInt(components[1]);
  }

  return null;
}

export class SkiLiftPopover extends PointPopover {
  private data: SkiLiftData;

  constructor(position: mapboxgl.LngLatLike, data: SkiLiftData) {
    super(position);
    this.data = data;
  }

  public addTo(map: mapboxgl.Map) {
    super.addTo(map);

    map.setFilter("selected-lift", ["==", "lid", this.data.lid]);
  }

  public remove(map: mapboxgl.Map) {
    super.remove(map);

    map.setFilter("selected-lift", ["==", "lid", -1]);
  }

  protected render(): React.ReactElement<any> {
    return <SkiLiftInfo data={this.data} />;
  }
}
