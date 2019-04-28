import { MapStyle } from "../MapStyle";

export default interface EventBus {
  openSidebar(): void;
  closeSidebar(): void;
  setMapStyle(style: MapStyle): void;
}
