import { MapStyle } from "../MapStyle";

export default interface State {
  editMapOpen: boolean;
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  mapStyle: MapStyle;
}

export interface StateChanges {
  editMapOpen?: boolean;
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapStyle?: MapStyle;
}
