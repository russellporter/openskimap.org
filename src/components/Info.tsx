import { Card } from "@material-ui/core";
import { Feature, Geometry } from "geojson";
import * as React from "react";
import { useEffect, useState } from "react";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import { FeatureType, SkiAreaData, SkiLiftData, SkiRunData } from "./MapData";
import { SkiAreaInfo } from "./SkiAreaInfo";
import { SkiLiftInfo } from "./SkiLiftInfo";
import { SkiRunInfo } from "./SkiRunInfo";

type MapFeature = Feature<Geometry, SkiRunData | SkiLiftData | SkiAreaData>;

export const Info: React.FunctionComponent<{
  lid: string;
  width: number;
  eventBus: EventBus;
  chartHighlightPosition: mapboxgl.LngLatLike | null;
  onHoverChartPosition: (position: mapboxgl.LngLatLike | null) => void;
}> = props => {
  const [data, setData] = useState<MapFeature | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      const data = await loadGeoJSON<SkiRunData | SkiLiftData | SkiAreaData>(
        props.lid
      );

      setData(data);
    };

    fetchData();
  }, [props.lid]);

  return (
    <Card style={{ width: props.width }}>
      {data && data.properties.type == FeatureType.Lift && (
        <SkiLiftInfo data={data.properties} eventBus={props.eventBus} />
      )}
      {data && data.properties.type == FeatureType.Run && (
        <SkiRunInfo
          data={data.properties}
          chartHighlightPosition={props.chartHighlightPosition}
          onHoverChartPosition={props.onHoverChartPosition}
          eventBus={props.eventBus}
        />
      )}
      {data && data.properties.type == FeatureType.SkiArea && (
        <SkiAreaInfo data={data.properties} eventBus={props.eventBus} />
      )}
    </Card>
  );
};
