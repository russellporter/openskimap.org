import { SkiAreaActivity } from "openskidata-format";
import { MapMarker } from "../MapMarker";
import { MapStyle, MapStyleOverlay } from "../MapStyle";
import { Track } from "../utils/TrackParser";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import { MapFeature, ObjectIDType, PanConfig } from "./SelectedObject";
import State, { StateChanges } from "./State";
import { URLState } from "./URLHistory";
import { updatePageMetadata } from "./utils/PageMetadata";
import { UnitSystem } from "./utils/UnitHelpers";

export default class StateReducer implements EventBus {
  _state: State;
  updateHandler: (state: State, changes: StateChanges) => void = () => {};
  editMapHandler: (() => void) | null = null;
  openSearchHandler: (() => void) | null = null;

  constructor(
    state: State,
    updateHandler: (state: State, changes: StateChanges) => void = () => {},
  ) {
    this._state = state;
    this.updateHandler = updateHandler;
  }

  editMap = () => {
    this.editMapHandler!();
  };

  openSearch = () => {
    this.openSearchHandler?.();
  };

  openSidebar = () => {
    this.update({ sidebarOpen: true });
  };

  closeSidebar = () => {
    this.update({ sidebarOpen: false });
  };

  openAboutInfo = () => {
    this.update({ aboutInfoOpen: true });
  };

  closeAboutInfo = () => {
    this.update({ aboutInfoOpen: false });
  };

  openLegal = () => {
    this.update({ legalOpen: true });
  };

  closeLegal = () => {
    this.update({ legalOpen: false });
  };

  openLegend = (section?: string) => {
    this.update({ legendOpen: true, legendSection: section ?? null });
  };

  closeLegend = () => {
    this.update({ legendOpen: false, legendSection: null });
  };

  openSettings = () => {
    this.update({ settingsOpen: true });
  };

  closeSettings = () => {
    this.update({ settingsOpen: false });
  };

  openLayers = () => {
    this.update({ layersOpen: true });
  };

  closeLayers = () => {
    this.update({ layersOpen: false });
  };

  setMapStyle = (style: MapStyle) => {
    this.update({ mapStyle: style });
  };

  setMapStyleOverlay = (overlay: MapStyleOverlay | null) => {
    this.update({ mapStyleOverlay: overlay });
  };

  setSunExposureDate = (date: Date) => {
    this.update({ sunExposureDate: date });
  };

  setUnitSystem = (unitSystem: UnitSystem) => {
    this.update({ unitSystem });
  };

  private loadInfoData = async (
    id: string,
    idType: ObjectIDType,
    options: { panAfterLoad: boolean; animate: boolean },
  ) => {
    try {
      const feature = await loadGeoJSON<MapFeature>(id, idType);
      updatePageMetadata(feature);

      if (this._state.selectedObject?.id === id) {
        const selectedObject = this._state.selectedObject;
        this.update({
          selectedObject: {
            ...selectedObject,
            feature,
            pan: options.panAfterLoad
              ? {
                  animate: options.animate,
                }
              : undefined,
          },
          ...(selectedObject.showInfo && {
            mapFilters: {
              ...this._state.mapFilters,
              selectedObjectID: feature.properties.id,
            },
          }),
        });
      }
    } catch (error) {
      console.log(error);
      this.hideInfo();
    }
  };

  urlUpdate = (state: URLState) => {
    const existingSelectedObjectID = this._state.mapFilters.selectedObjectID;
    const showInfo = state.selectedObjectID ? state.showInfo : false;
    this.update({
      aboutInfoOpen: state.aboutInfoOpen,
      legalOpen: state.legalOpen,
      legendOpen: state.legendOpen,
      selectedObject: state.selectedObjectID
        ? {
            id: state.selectedObjectID,
            idType: state.selectedObjectIDType,
            pan: { animate: false },
            showInfo,
          }
        : null,
      mapFilters: {
        ...this._state.mapFilters,
        selectedObjectID:
          showInfo && state.selectedObjectIDType === "openskimap"
            ? state.selectedObjectID
            : null,
      },
      markers: state.markers,
    });

    if (
      state.selectedObjectID &&
      state.selectedObjectID !== existingSelectedObjectID
    ) {
      this.loadInfoData(state.selectedObjectID, state.selectedObjectIDType, {
        panAfterLoad: true,
        animate: false,
      });
    }
  };

  showInfo = (id: string, pan?: PanConfig, idType: ObjectIDType = "openskimap") => {
    this.update({
      selectedObject: { id, idType, showInfo: true },
      mapFilters: { ...this._state.mapFilters, selectedObjectID: id },
    });

    this.loadInfoData(id, idType, {
      panAfterLoad: pan !== undefined,
      animate: pan?.animate == true,
    });
  };

  hideInfo = () => {
    this.update({
      selectedObject: null,
      mapFilters: { ...this._state.mapFilters, selectedObjectID: null },
    });
  };

  toggleActivity = (activity: SkiAreaActivity) => {
    let hiddenActivities = this._state.mapFilters.hiddenActivities || [];
    if (hiddenActivities.includes(activity)) {
      hiddenActivities = hiddenActivities.filter((a) => a !== activity);
    } else {
      hiddenActivities.push(activity);
    }
    this.update({
      mapFilters: {
        ...this._state.mapFilters,
        hiddenActivities: hiddenActivities,
      },
    });
  };

  setMinimumElevation(elevation: number) {
    this.update({
      mapFilters: {
        ...this._state.mapFilters,
        minElevation: elevation,
      },
    });
  }
  setMinimumVertical(vertical: number) {
    this.update({
      mapFilters: {
        ...this._state.mapFilters,
        minVertical: vertical,
      },
    });
  }

  setMinimumRunLength(runLength: number): void {
    this.update({
      mapFilters: {
        ...this._state.mapFilters,
        minRunLength: runLength,
      },
    });
  }

  addMarker(marker: MapMarker): void {
    this.update({
      markers: [...this._state.markers, marker],
      latestMarker: marker,
    });
  }

  addTrack = (track: Track) => {
    const newTracks = [...this._state.tracks, track];
    this.update({ tracks: newTracks });
  };

  removeTrack = (trackId: string) => {
    const newTracks = this._state.tracks.filter(
      (track) => track.id !== trackId,
    );
    this.update({ tracks: newTracks });
  };

  startDrawingTrack = () => {
    this.update({
      isDrawingTrack: true,
      drawingTrackCoordinates: [],
      layersOpen: false, // Close layers modal when starting to draw
    });
  };

  addDrawingTrackPoint = (coordinate: [number, number]) => {
    const newCoordinates = [...this._state.drawingTrackCoordinates, coordinate];
    this.update({ drawingTrackCoordinates: newCoordinates });
  };

  removeLastDrawingTrackPoint = () => {
    if (this._state.drawingTrackCoordinates.length > 0) {
      const newCoordinates = this._state.drawingTrackCoordinates.slice(0, -1);
      this.update({ drawingTrackCoordinates: newCoordinates });
    }
  };

  finishDrawingTrack = (name: string) => {
    if (this._state.drawingTrackCoordinates.length >= 2) {
      const track = this.createTrackFromCoordinates(
        name,
        this._state.drawingTrackCoordinates,
      );
      const newTracks = [...this._state.tracks, track];
      this.update({
        tracks: newTracks,
        isDrawingTrack: false,
        drawingTrackCoordinates: [],
      });
    } else {
      this.update({
        isDrawingTrack: false,
        drawingTrackCoordinates: [],
      });
    }
  };

  cancelDrawingTrack = () => {
    this.update({
      isDrawingTrack: false,
      drawingTrackCoordinates: [],
    });
  };

  private createTrackFromCoordinates(
    name: string,
    coordinates: [number, number][],
  ): Track {
    const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const color = "#4CAF50"; // Green for hand-drawn tracks
    const lengthKm = this.calculateTrackLength(coordinates);
    return { id, name, coordinates, color, lengthKm };
  }

  private calculateTrackLength(coordinates: [number, number][]): number {
    if (coordinates.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }

    return Math.round(totalDistance * 10) / 10;
  }

  setVisibleSkiAreasCount = (count: number) => {
    this.update({ visibleSkiAreasCount: count });
  };

  setTerrainInspectorEnabled = (enabled: boolean) => {
    this.update({ terrainInspectorEnabled: enabled });
  };

  private update(changes: StateChanges): void {
    const state = this._state as { [key: string]: any };
    Object.keys(changes).forEach((key) => {
      const change = (changes as { [key: string]: any })[key];

      if (state[key] !== change) {
        state[key] = change;
      } else {
        delete (changes as { [key: string]: any })[key];
      }
    });
    this.updateHandler(this._state, changes);
  }
}
