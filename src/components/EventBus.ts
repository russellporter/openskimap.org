import { MapStyle } from "../MapStyle";

export default interface EventBus {
  openSidebar(): void;
  closeSidebar(): void;
  openAboutInfo(): void;
  closeAboutInfo(): void;
  setMapStyle(style: MapStyle): void;
}
