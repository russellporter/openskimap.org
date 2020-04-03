import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";
import { URLHashState } from "./URLHash";

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

export function getInitialState(urlHash: URLHashState) {
  return {
    editMapOpen: false,
    sidebarOpen: false,
    aboutInfoOpen: urlHash.aboutInfoOpen,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapFilters: defaultMapFilters,
    info: null
  };
}
