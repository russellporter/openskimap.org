import * as maplibregl from "maplibre-gl";
import {
  LiftFeature,
  RunFeature,
  SkiAreaFeature,
} from "openskidata-format";

export type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export interface PanConfig {
  target?: maplibregl.LngLatLike;
  afterLoad?: boolean;
  animate?: boolean;
}

export interface InfoData {
  id: string;
  pan: PanConfig;
  feature?: MapFeature;
}
