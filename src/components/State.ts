import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";
import { getUnitSystem_NonReactive } from "./UnitSystemManager";
import * as UnitHelpers from "./utils/UnitHelpers";

export default interface State {
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  settingsOpen: boolean;
  mapFiltersOpen: boolean;
  mapStyle: MapStyle;
  mapFilters: MapFilters;
  info: InfoData | null;
  markers: MapMarker[];
  unitSystem: UnitHelpers.UnitSystem;
}

export interface StateChanges {
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  settingsOpen?: boolean;
  mapFiltersOpen?: boolean;
  mapStyle?: MapStyle;
  mapFilters?: MapFilters;
  info?: InfoData | null;
  markers?: MapMarker[];
  latestMarker?: MapMarker;
  unitSystem?: UnitHelpers.UnitSystem;
}

export function getInitialState(): State {
  return {
    sidebarOpen: false,
    aboutInfoOpen: false,
    settingsOpen: false,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapFilters: defaultMapFilters,
    info: null,
    markers: [],
    unitSystem: getUnitSystem_NonReactive(),
  };
}
