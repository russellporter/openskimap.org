import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import State from "./State";

export default class StateStore implements EventBus {
  _state: State;
  updateHandler: (state: State) => void = () => {};

  constructor(state: State, updateHandler: (state: State) => void = () => {}) {
    this._state = state;
    this.updateHandler = updateHandler;
  }

  openSidebar = () => {
    this._state.sidebarOpen = true;
    this.update();
  };

  closeSidebar = () => {
    this._state.sidebarOpen = false;
    this.update();
  };

  setMapStyle(style: MapStyle): void {
    this._state.mapStyle = style;
    this.update();
  }

  private update(): void {
    this.updateHandler(this._state);
  }
}
