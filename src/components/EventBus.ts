import { SkiAreaActivity } from "openskidata-format";
import { MapMarker } from "../MapMarker";
import { MapStyle } from "../MapStyle";
import { InfoData } from "./InfoData";
import { UnitSystem } from "./utils/UnitHelpers";

export default interface EventBus {
  editMap(): void;
  openSidebar(): void;
  closeSidebar(): void;
  openAboutInfo(): void;
  closeAboutInfo(): void;
  openLegal(): void;
  closeLegal(): void;
  openSettings(): void;
  closeSettings(): void;
  setMapStyle(style: MapStyle): void;
  setUnitSystem(unitSystem: UnitSystem): void;
  toggleActivity(activity: SkiAreaActivity): void;
  setMinimumElevation(elevation: number): void;
  setMinimumVertical(vertical: number): void;
  setMinimumRunLength(runLength: number): void;
  addMarker(marker: MapMarker): void;
  showInfo(info: InfoData): void;
  hideInfo(): void;
  showFilters(): void;
  hideFilters(): void;
}
