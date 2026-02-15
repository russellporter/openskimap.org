import * as maplibregl from "maplibre-gl";
import {
  LiftFeature,
  RunFeature,
  SkiAreaFeature,
} from "openskidata-format";

export type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export interface InfoData {
  id: string;
  panToPosition: maplibregl.LngLatLike | null | "afterLoad";
  feature?: MapFeature;
}
