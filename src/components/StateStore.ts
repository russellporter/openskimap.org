import { Activity } from "openskidata-format";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { InfoData } from "./InfoData";
import State, { StateChanges } from "./State";

export default class StateStore implements EventBus {
  _state: State;
  updateHandler: (state: State, changes: StateChanges) => void = () => {};

  constructor(
    state: State,
    updateHandler: (state: State, changes: StateChanges) => void = () => {}
  ) {
    this._state = state;
    this.updateHandler = updateHandler;
  }

  editMap = () => {
    this.update({ editMapOpen: true });
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

  showInfo = (info: InfoData) => {
    this.update({ info: info });
  };

  hideInfo = () => {
    this.update({ info: null });
  };

  toggleActivity = (activity: Activity) => {
    let hiddenActivities = this._state.mapFilters.hiddenActivities || [];
    if (hiddenActivities.includes(activity)) {
      hiddenActivities = hiddenActivities.filter(a => a !== activity);
    } else {
      hiddenActivities.push(activity);
    }
    this.update({
      mapFilters: {
        ...this._state.mapFilters,
        hiddenActivities: hiddenActivities
      }
    });
  };

  private update(changes: StateChanges): void {
    Object.keys(changes).forEach(key => {
      const change = (changes as { [key: string]: any })[key];
      (this._state as { [key: string]: any })[key] = change;
    });
    this.updateHandler(this._state, changes);
  }
}
