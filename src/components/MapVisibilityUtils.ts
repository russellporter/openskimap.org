import * as maplibregl from "maplibre-gl";
import { SkiAreaFeature } from "openskidata-format";
import MapFilters from "../MapFilters";
import { getFilterRules } from "./MapFilterRules";

export function getVisibleSkiAreasCount(
  map: maplibregl.Map,
  filters: MapFilters
): number {
  const activeRules = getFilterRules(filters);
  const rules = activeRules.skiAreas;

  if (rules === "hidden") {
    return 0;
  }

  let filter: maplibregl.FilterSpecification | null = null;
  if (rules && typeof rules !== "string") {
    filter = rules;
  }

  const loadedSkiAreas = map.querySourceFeatures("openskimap", {
    sourceLayer: "skiareas",
    filter: filter || undefined,
  });

  const bounds = map.getBounds();

  // For unknown reasons, the same ski area is often returned twice from querySourceFeatures.
  // Also querySourceFeatures can return ski areas that are slightly off screen,
  const skiAreaIDs = new Set(
    loadedSkiAreas
      .filter(
        (skiArea) =>
          skiArea.geometry.type === "Point" &&
          bounds.contains(skiArea.geometry.coordinates as [number, number])
      )
      .map((skiArea) => skiArea.properties as SkiAreaFeature)
      .map((skiAreaProperties) => skiAreaProperties.id)
  );

  return skiAreaIDs.size;
}