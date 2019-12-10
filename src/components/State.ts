import MapFilters from "../MapFilters";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";

export default interface State {
  editMapOpen: boolean;
  sidebarOpen: boolean;
  aboutInfoOpen: boolean;
  mapStyle: MapStyle;
  mapFilters: MapFilters;
  info: InfoData | null;
}

export interface StateChanges {
  editMapOpen?: boolean;
  sidebarOpen?: boolean;
  aboutInfoOpen?: boolean;
  mapStyle?: MapStyle;
  mapFilters?: MapFilters;
  info?: InfoData | null;
}
