import {
  FeatureType,
  LiftFeature,
  RunFeature,
  SkiAreaFeature,
} from "openskidata-format";
import * as React from "react";
import { useEffect, useState } from "react";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import { SkiAreaInfo } from "./SkiAreaInfo";
import { SkiLiftInfo } from "./SkiLiftInfo";
import { SkiRunInfo } from "./SkiRunInfo";
import { updatePageMetadata } from "./utils/PageMetadata";
import * as UnitHelpers from "./utils/UnitHelpers";

type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export const Info: React.FunctionComponent<{
  id: string;
  width: number;
  eventBus: EventBus;
  unitSystem: UnitHelpers.UnitSystem;
  onLoadFeature: (feature: MapFeature) => void;
  map: mapboxgl.Map;
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

      updatePageMetadata(data);
      setFeature(data);
      props.onLoadFeature(data);
    };

    fetchData();
  }, [props.id]);

  return (
    <>
      {feature && feature.properties.type == FeatureType.Lift && (
        <SkiLiftInfo
          feature={feature as LiftFeature}
          eventBus={props.eventBus}
          unitSystem={props.unitSystem}
          width={props.width}
        />
      )}
      {feature && feature.properties.type == FeatureType.Run && (
        <SkiRunInfo
          feature={feature as RunFeature}
          map={props.map}
          eventBus={props.eventBus}
          unitSystem={props.unitSystem}
          width={props.width}
        />
      )}
      {feature && feature.properties.type == FeatureType.SkiArea && (
        <SkiAreaInfo
          feature={feature as SkiAreaFeature}
          eventBus={props.eventBus}
          unitSystem={props.unitSystem}
          width={props.width}
        />
      )}
    </>
  );
};
