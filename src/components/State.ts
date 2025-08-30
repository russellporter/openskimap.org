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
  // Load saved map style from localStorage, default to Terrain
  const savedMapStyle = localStorage.getItem("mapStyle") as MapStyle;
  const mapStyle = savedMapStyle && Object.values(MapStyle).includes(savedMapStyle) 
    ? savedMapStyle 
    : MapStyle.Terrain;

  // Load saved overlay from localStorage, default to Slope
  const savedOverlay = localStorage.getItem("mapStyleOverlay");
  let mapStyleOverlay: MapStyleOverlay | null = MapStyleOverlay.Slope;
  
  if (savedOverlay === "null" || savedOverlay === null) {
    mapStyleOverlay = null;
  } else if (savedOverlay && Object.values(MapStyleOverlay).includes(savedOverlay as MapStyleOverlay)) {
    mapStyleOverlay = savedOverlay as MapStyleOverlay;
  }

  return {
    sidebarOpen: false,
    aboutInfoOpen: false,
    legalOpen: false,
    settingsOpen: false,
    layersOpen: false,
    mapFiltersOpen: false,
    mapStyle,
    mapStyleOverlay,
    mapFilters: defaultMapFilters,
    info: null,
    markers: [],
    unitSystem: getUnitSystem_NonReactive(),
  };
}
