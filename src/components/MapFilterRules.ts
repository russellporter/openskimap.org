import * as maplibregl from "maplibre-gl";
import { SkiAreaActivity } from "openskidata-format";
import MapFilters from "../MapFilters";

// A filter rule can be a MapLibre expression filter, "hidden" (to hide the object completely), or null (no filter)
export type ObjectFilterRules = maplibregl.ExpressionFilterSpecification | "hidden" | null;

export interface MapFilterRules {
  runs: ObjectFilterRules;
  skiAreas: ObjectFilterRules;
  lifts: ObjectFilterRules;
  selected: ObjectFilterRules;
}

export function noRules(): MapFilterRules {
  return {
    runs: null,
    skiAreas: null,
    lifts: null,
    selected: null,
  };
}

export function getFilterRules(filters: MapFilters): MapFilterRules {
  return [
    getActivityFilterRules(filters),
    getElevationFilterRules(filters),
    getVerticalFilterRules(filters),
    getRunLengthFilterRules(filters),
    getSelectedObjectFilterRules(filters),
  ].reduce((previous, rules) => {
    return {
      runs: combine(previous.runs, rules.runs),
      lifts: combine(previous.lifts, rules.lifts),
      skiAreas: combine(previous.skiAreas, rules.skiAreas),
      selected: combine(previous.selected, rules.selected),
    };
  }, noRules());
}

export function combine(
  left: ObjectFilterRules,
  right: ObjectFilterRules
): ObjectFilterRules {
  if (left === "hidden" || right === "hidden") {
    return "hidden";
  }

  if (!left && !right) return null;
  if (!left) return right;
  if (!right) return left;

  // Combine filters using "all"
  return ["all", left, right] as any;
}

function getActivityFilterRules(filters: MapFilters): MapFilterRules {
  const hasDownhill = !filters.hiddenActivities.includes(
    SkiAreaActivity.Downhill
  );
  const hasNordic = !filters.hiddenActivities.includes(SkiAreaActivity.Nordic);
  if (!hasDownhill && !hasNordic) {
    return {
      skiAreas: "hidden",
      lifts: "hidden",
      runs: ["has", "other"],
      selected: null,
    };
  } else if (hasDownhill && !hasNordic) {
    return {
      skiAreas: ["has", "has_downhill"],
      lifts: null,
      runs: ["any", ["has", "downhill"], ["has", "skitour"]],
      selected: null,
    };
  } else if (hasNordic && !hasDownhill) {
    return {
      skiAreas: ["has", "has_nordic"],
      lifts: "hidden",
      runs: ["has", "nordic"],
      selected: null,
    };
  } else {
    return noRules();
  }
}

function getElevationFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minElevation) {
    return {
      skiAreas: [">", ["get", "maxElevation"], filters.minElevation],
      lifts: null,
      runs: null,
      selected: null,
    };
  } else {
    return noRules();
  }
}

function getVerticalFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minVertical) {
    return {
      skiAreas: [">", ["get", "vertical"], filters.minVertical],
      lifts: null,
      runs: null,
      selected: null,
    };
  } else {
    return noRules();
  }
}

function getRunLengthFilterRules(filters: MapFilters): MapFilterRules {
  if (!filters.minRunLength) {
    return noRules();
  }

  const hasDownhill = !filters.hiddenActivities.includes(
    SkiAreaActivity.Downhill
  );
  const hasNordic = !filters.hiddenActivities.includes(SkiAreaActivity.Nordic);

  const rules: maplibregl.ExpressionSpecification[] = [];
  if (hasDownhill) {
    rules.push([">", ["get", "downhillDistance"], filters.minRunLength]);
  }
  if (hasNordic) {
    rules.push([">", ["get", "nordicDistance"], filters.minRunLength]);
  }

  let skiAreasFilter: ObjectFilterRules = null;
  if (rules.length > 1) {
    skiAreasFilter = ["any", ...rules];
  } else if (rules.length === 1) {
    skiAreasFilter = rules[0];
  }

  return {
    skiAreas: skiAreasFilter,
    lifts: null,
    runs: null,
    selected: null,
  };
}

function getSelectedObjectFilterRules(filters: MapFilters): MapFilterRules {
  const rules = noRules();
  if (filters.selectedObjectID) {
    rules.selected = [
      "any",
      ["==", ["get", "id"], filters.selectedObjectID],
      ["in", filters.selectedObjectID, ["get", "skiAreas"]],
    ];
  } else {
    rules.selected = null;
  }

  return rules;
}