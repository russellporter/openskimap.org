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
}

export interface StateChanges {
  sidebarOpen?: boolean;
  legendOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapFiltersOpen?: boolean;
  mapStyle?: MapStyle;
  mapFilters?: MapFilters;
  info?: InfoData | null;
}

export function getInitialState() {
  return {
    sidebarOpen: false,
    aboutInfoOpen: false,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapFilters: defaultMapFilters,
    info: null,
  };
}
