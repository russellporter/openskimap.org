import { Card } from "@material-ui/core";
import { FeatureType, SkiAreaFeature } from "openskidata-format";
import * as React from "react";
import { useEffect, useState } from "react";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import { FullLiftFeature, FullRunFeature } from "./Model";
import { SkiAreaInfo } from "./SkiAreaInfo";
import { SkiLiftInfo } from "./SkiLiftInfo";
import { SkiRunInfo } from "./SkiRunInfo";
import { updatePageMetadata } from "./utils/PageMetadata";

type MapFeature = FullRunFeature | FullLiftFeature | SkiAreaFeature;

export const Info: React.FunctionComponent<{
  id: string;
  width: number;
  eventBus: EventBus;
  chartHighlightPosition: mapboxgl.LngLat | null;
  onLoadFeature: (feature: MapFeature) => void;
  onHoverChartPosition: (position: mapboxgl.LngLat | null) => void;
}> = (props) => {
  const [feature, setFeature] = useState<MapFeature | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      let data: MapFeature;
      try {
        data = await loadGeoJSON<MapFeature>(props.id);
      } catch (error) {
        console.log(error);
        props.eventBus.hideInfo();
        return;
      }

      let skiAreaNames: string[] = [];
      const properties = data.properties;
      if (
        properties.type === FeatureType.Lift ||
        properties.type === FeatureType.Run
      ) {
        try {
          properties.skiAreaFeatures = await Promise.all(
            properties.skiAreas.map((id) => loadGeoJSON<SkiAreaFeature>(id))
          );
        } catch (error) {
          console.log(error);
          properties.skiAreaFeatures = [];
        }
      }

      updatePageMetadata(data);
      setFeature(data);
      props.onLoadFeature(data);
    };

    fetchData();
  }, [props.id]);

  return (
    <Card style={{ width: props.width }}>
      {feature && feature.properties.type == FeatureType.Lift && (
        <SkiLiftInfo
          feature={feature as FullLiftFeature}
          eventBus={props.eventBus}
        />
      )}
      {feature && feature.properties.type == FeatureType.Run && (
        <SkiRunInfo
          feature={feature as FullRunFeature}
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
