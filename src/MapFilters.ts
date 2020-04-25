import { Activity } from "openskidata-format";

export default interface MapFilters {
  hiddenActivities: Activity[];
  minElevation: number | null;
  minVertical: number | null;
  minRunLength: number | null;
  selectedObjectID: string | null;
}

export const defaultMapFilters = {
  hiddenActivities: [],
  minVertical: null,
  minElevation: null,
  minRunLength: null,
  selectedObjectID: null,
};
