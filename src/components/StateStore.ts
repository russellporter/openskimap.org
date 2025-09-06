import { SkiAreaActivity } from "openskidata-format";
import { MapMarker } from "../MapMarker";
import { MapStyle, MapStyleOverlay } from "../MapStyle";
import { Track } from "../utils/TrackParser";
import EventBus from "./EventBus";
import { InfoData } from "./InfoData";
import State, { StateChanges } from "./State";
import { URLState } from "./URLHistory";
import { UnitSystem } from "./utils/UnitHelpers";

export default class StateStore implements EventBus {
  _state: State;
  updateHandler: (state: State, changes: StateChanges) => void = () => {};
  editMapHandler: (() => void) | null = null;

  constructor(
    state: State,
    updateHandler: (state: State, changes: StateChanges) => void = () => {}
  ) {
    this._state = state;
    this.updateHandler = updateHandler;
  }

  editMap = () => {
    this.editMapHandler!();
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

  urlUpdate = (state: URLState) => {
    this.update({
      aboutInfoOpen: state.aboutInfoOpen,
      legalOpen: state.legalOpen,
      info: state.selectedObjectID
        ? { id: state.selectedObjectID, panToPosition: "afterLoad" }
        : null,
      mapFilters: {
        ...this._state.mapFilters,
        selectedObjectID: state.selectedObjectID,
      },
      markers: state.markers,
    });
  };

  showInfo = (info: InfoData) => {
    this.update({
      info: info,
      mapFilters: { ...this._state.mapFilters, selectedObjectID: info.id },
    });
  };

  hideInfo = () => {
    this.update({
      info: null,
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
    const newTracks = this._state.tracks.filter(track => track.id !== trackId);
    this.update({ tracks: newTracks });
  };

  showFilters = () => {
    this.update({ mapFiltersOpen: true });
  };
  hideFilters = () => {
    this.update({ mapFiltersOpen: false });
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
