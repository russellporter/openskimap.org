import { Activity } from "openskidata-format";

export default interface MapFilters {
  hiddenActivities: Activity[];
  minElevation: number | null;
  minVertical: number | null;
  minRunLength: number | null;
}

export const defaultMapFilters = {
  hiddenActivities: [],
  minVertical: null,
  minElevation: null,
  minRunLength: null
};
