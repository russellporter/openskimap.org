import { Activity } from "openskidata-format";
import { MapMarker } from "../MapMarker";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { InfoData } from "./InfoData";
import State, { StateChanges } from "./State";
import { URLState } from "./URLHistory";

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

  setMapStyle = (style: MapStyle) => {
    this.update({ mapStyle: style });
  };

  urlUpdate = (state: URLState) => {
    this.update({
      aboutInfoOpen: state.aboutInfoOpen,
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

  toggleActivity = (activity: Activity) => {
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
