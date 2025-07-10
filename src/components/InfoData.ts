import * as maplibregl from "maplibre-gl";

export interface InfoData {
  id: string;
  panToPosition: maplibregl.LngLatLike | null | "afterLoad";
}
