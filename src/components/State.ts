import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";

export default interface State {
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  mapFiltersOpen: boolean;
  mapStyle: MapStyle;
  mapFilters: MapFilters;
  info: InfoData | null;
  markers: MapMarker[];
}

export interface StateChanges {
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapFiltersOpen?: boolean;
  mapStyle?: MapStyle;
  mapFilters?: MapFilters;
  info?: InfoData | null;
  markers?: MapMarker[];
  latestMarker?: MapMarker;
}

export function getInitialState(): State {
  return {
    sidebarOpen: false,
    aboutInfoOpen: false,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapFilters: defaultMapFilters,
    info: null,
    markers: [],
  };
}
