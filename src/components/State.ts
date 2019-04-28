import { MapStyle } from "../MapStyle";

export default interface State {
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  mapStyle: MapStyle;
}

export interface StateChange {
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapStyle?: MapStyle;
}
