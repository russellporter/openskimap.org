import { Card } from "@material-ui/core";
import {
  FeatureType,
  LiftFeature,
  RunFeature,
  SkiAreaFeature
} from "openskidata-format";
import * as React from "react";
import { useEffect, useState } from "react";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import { SkiAreaInfo } from "./SkiAreaInfo";
import { SkiLiftInfo } from "./SkiLiftInfo";
import { SkiRunInfo } from "./SkiRunInfo";

type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export const Info: React.FunctionComponent<{
  id: string;
  width: number;
  eventBus: EventBus;
  chartHighlightPosition: mapboxgl.LngLatLike | null;
  onHoverChartPosition: (position: mapboxgl.LngLatLike | null) => void;
}> = props => {
  const [feature, setFeature] = useState<MapFeature | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      const data = await loadGeoJSON<MapFeature>(props.id);

      setFeature(data);
    };

    fetchData();
  }, [props.id]);

  return (
    <Card style={{ width: props.width }}>
      {feature && feature.properties.type == FeatureType.Lift && (
        <SkiLiftInfo
          feature={feature as LiftFeature}
          eventBus={props.eventBus}
        />
      )}
      {feature && feature.properties.type == FeatureType.Run && (
        <SkiRunInfo
          feature={feature as RunFeature}
          chartHighlightPosition={props.chartHighlightPosition}
          onHoverChartPosition={props.onHoverChartPosition}
          eventBus={props.eventBus}
        />
      )}
      {feature && feature.properties.type == FeatureType.SkiArea && (
        <SkiAreaInfo
          feature={feature as SkiAreaFeature}
          eventBus={props.eventBus}
        />
      )}
    </Card>
  );
};
