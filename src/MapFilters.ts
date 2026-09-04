import { SkiAreaActivity } from "openskidata-format";
import { SkiPassFilterKey } from "./SkiPasses";

export default interface MapFilters {
  hiddenActivities: SkiAreaActivity[];
  minElevation: number | null;
  minVertical: number | null;
  minRunLength: number | null;
  /**
   * Actual ski passes to limit ski areas to. Empty means no ski pass filtering, so this
   * is a positive selection, unlike hiddenActivities.
   */
  selectedSkiPasses: SkiPassFilterKey[];
  selectedObjectID: string | null;
}

export const defaultMapFilters: MapFilters = {
  hiddenActivities: [],
  minVertical: null,
  minElevation: null,
  minRunLength: null,
  selectedSkiPasses: [],
  selectedObjectID: null,
};
