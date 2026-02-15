import {
  FeatureType,
  LiftFeature,
  RunFeature,
  SkiAreaFeature,
} from "openskidata-format";
import * as maplibregl from "maplibre-gl";
import * as React from "react";
import EventBus from "./EventBus";
import { MapFeature } from "./InfoData";
import { SkiAreaInfo } from "./SkiAreaInfo";
import { SkiLiftInfo } from "./SkiLiftInfo";
import { SkiRunInfo } from "./SkiRunInfo";
import * as UnitHelpers from "./utils/UnitHelpers";

export const Info: React.FunctionComponent<{
  id: string;
  feature: MapFeature;
  width: number;
  eventBus: EventBus;
  unitSystem: UnitHelpers.UnitSystem;
  map: maplibregl.Map;
}> = (props) => {
  const feature = props.feature;

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
