import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MapStyle, MapStyleOverlay } from "../MapStyle";
import { Track } from "../utils/TrackParser";
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
  tracks: Track[];
  unitSystem: UnitHelpers.UnitSystem;
  sunExposureDate: Date;
  isDrawingTrack: boolean;
  drawingTrackCoordinates: [number, number][];
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
  tracks?: Track[];
  unitSystem?: UnitHelpers.UnitSystem;
  sunExposureDate?: Date;
  isDrawingTrack?: boolean;
  drawingTrackCoordinates?: [number, number][];
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

  // Load saved tracks from localStorage
  const savedTracks = localStorage.getItem("tracks");
  let tracks: Track[] = [];
  if (savedTracks) {
    try {
      tracks = JSON.parse(savedTracks);
    } catch (e) {
      // If parsing fails, start with empty array
      tracks = [];
    }
  }

  // Load saved sun exposure date from localStorage, default to January 15th for winter skiing
  const savedSunExposureDate = localStorage.getItem("sunExposureDate");
  let sunExposureDate: Date;
  
  if (savedSunExposureDate) {
    try {
      sunExposureDate = new Date(savedSunExposureDate);
      // Validate the date
      if (isNaN(sunExposureDate.getTime())) {
        throw new Error("Invalid date");
      }
    } catch (e) {
      // If parsing fails, use default
      sunExposureDate = new Date();
      sunExposureDate.setMonth(0); // January
      sunExposureDate.setDate(15);
    }
  } else {
    // Default to January 15th for winter skiing
    sunExposureDate = new Date();
    sunExposureDate.setMonth(0); // January
    sunExposureDate.setDate(15);
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
    tracks,
    unitSystem: getUnitSystem_NonReactive(),
    sunExposureDate,
    isDrawingTrack: false,
    drawingTrackCoordinates: [],
  };
}
