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
  showInfo(info: InfoData): void;
  hideInfo(): void;
}
