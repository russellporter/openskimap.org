import { Feature, Geometry } from "geojson";
import "whatwg-fetch";
import { SkiLiftData, SkiRunData } from "./MapData";

export function loadRun(lid: string): Promise<Feature<Geometry, SkiRunData>> {
  return loadGeoJSON(lid);
}

export function loadLift(lid: string): Promise<Feature<Geometry, SkiLiftData>> {
  return loadGeoJSON(lid);
}

export function loadGeoJSON<T>(
  entityLID: string
): Promise<Feature<Geometry, T>> {
  return fetch(
    "https://tiles.skimap.org/features/" + entityLID + ".geojson"
  ).then(response => {
    return response.json();
  });
}
