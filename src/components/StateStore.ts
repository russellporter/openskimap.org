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

  setMapStyle(style: MapStyle): void {
    this.update({ mapStyle: style });
  }

  showInfo(info: InfoData): void {
    this.update({ info: info });
  }

  hideInfo(): void {
    this.update({ info: null });
  }

  private update(changes: StateChanges): void {
    Object.keys(changes).forEach(key => {
      const change = (changes as { [key: string]: any })[key];
      (this._state as { [key: string]: any })[key] = change;
    });
    this.updateHandler(this._state, changes);
  }
}
