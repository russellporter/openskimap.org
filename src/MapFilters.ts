import { SkiAreaActivity } from "openskidata-format";

export default interface MapFilters {
  hiddenActivities: SkiAreaActivity[];
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
