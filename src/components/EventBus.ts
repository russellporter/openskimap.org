import { Activity } from "openskidata-format";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";

export default interface EventBus {
  editMap(): void;
  openSidebar(): void;
  closeSidebar(): void;
  openAboutInfo(): void;
  closeAboutInfo(): void;
  setMapStyle(style: MapStyle): void;
  toggleActivity(activity: Activity): void;
  setMinimumElevation(elevation: number): void;
  setMinimumVertical(vertical: number): void;
  setMinimumRunLength(runLength: number): void;
  showInfo(info: InfoData): void;
  hideInfo(): void;
  showFilters(): void;
  hideFilters(): void;
}
