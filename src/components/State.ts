import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MapStyle, MapStyleOverlay } from "../MapStyle";
import { InfoData } from "./InfoData";
import { getUnitSystem_NonReactive } from "./UnitSystemManager";
import * as UnitHelpers from "./utils/UnitHelpers";

export default interface State {
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  legalOpen: boolean;
  settingsOpen: boolean;
  layersOpen: boolean;
  mapFiltersOpen: boolean;
  mapStyle: MapStyle;
  mapStyleOverlay: MapStyleOverlay | null;
  mapFilters: MapFilters;
  info: InfoData | null;
  markers: MapMarker[];
  unitSystem: UnitHelpers.UnitSystem;
}

export interface StateChanges {
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  legalOpen?: boolean;
  settingsOpen?: boolean;
  layersOpen?: boolean;
  mapFiltersOpen?: boolean;
  mapStyle?: MapStyle;
  mapStyleOverlay?: MapStyleOverlay | null;
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
    legalOpen: false,
    settingsOpen: false,
    layersOpen: false,
    mapFiltersOpen: false,
    mapStyle: MapStyle.Terrain,
    mapStyleOverlay: MapStyleOverlay.Slope,
    mapFilters: defaultMapFilters,
    info: null,
    markers: [],
    unitSystem: getUnitSystem_NonReactive(),
  };
}
