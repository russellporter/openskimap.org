import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";

export default interface State {
  editMapOpen: boolean;
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  mapFiltersOpen: boolean;
  mapStyle: MapStyle;
  mapFilters: MapFilters;
  info: InfoData | null;
}

export interface StateChanges {
  editMapOpen?: boolean;
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapFiltersOpen?: boolean;
  mapStyle?: MapStyle;
  mapFilters?: MapFilters;
  info?: InfoData | null;
}

export function getInitialState() {
  return {
    editMapOpen: false,
    sidebarOpen: false,
    aboutInfoOpen: false,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapFilters: defaultMapFilters,
    info: null
  };
}
