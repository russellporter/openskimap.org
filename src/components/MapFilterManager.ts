import { Activity, RunUse } from "openskidata-format";
import MapFilters from "../MapFilters";

export default class MapFiltersManager {
  private map: mapboxgl.Map;
  private originalFilters: Map<string, any[] | undefined> = new Map();

  constructor(map: mapboxgl.Map) {
    this.map = map;
  }

  setFilters = (filters: MapFilters) => {
    const rules = getFilterRules(filters);

    this.skiAreaLayers().forEach(layer =>
      this.setFilterOverride(layer, rules.skiAreas)
    );

    this.runLayers().forEach(layer =>
      this.setFilterOverride(layer, rules.runs)
    );

    this.liftLayers().forEach(layer =>
      this.setFilterOverride(layer, rules.lifts)
    );
  };

  private runLayers = () => {
    return this.layers()
      .filter(layer => layer["source-layer"] === "runs")
      .map(layer => layer.id);
  };

  private liftLayers = () => {
    return this.layers()
      .filter(layer => layer["source-layer"] === "lifts")
      .map(layer => layer.id);
  };

  private skiAreaLayers = () => {
    return this.layers()
      .filter(layer => layer["source-layer"] === "skiareas")
      .map(layer => layer.id);
  };

  private layers = () => {
    return this.map.getStyle().layers || [];
  };

  private setFilterOverride = (layerName: string, rules: any[] | "hidden") => {
    const layer = this.map.getLayer(layerName);
    if (!layer) {
      return;
    }

    if (rules === "hidden") {
      this.map.setLayoutProperty(layer.id, "visibility", "none");
      return;
    } else {
      this.map.setLayoutProperty(layer.id, "visibility", "visible");
    }

    if (!this.originalFilters.has(layerName)) {
      this.originalFilters.set(layerName, layer.filter);
    }

    const originalFilter = this.originalFilters.get(layerName);
    this.map.setFilter(
      layerName,
      rules.length > 0 ? ["all", originalFilter].concat(rules) : originalFilter
    );
  };
}

type ObjectFilterRules = any[] | "hidden";

interface MapFilterRules {
  runs: ObjectFilterRules;
  skiAreas: ObjectFilterRules;
  lifts: ObjectFilterRules;
}

function noRules(): MapFilterRules {
  return { runs: [], skiAreas: [], lifts: [] };
}

function getFilterRules(filters: MapFilters): MapFilterRules {
  return [
    getActivityFilterRules(filters),
    getElevationFilterRules(filters),
    getVerticalFilterRules(filters),
    getRunLengthFilterRules(filters)
  ].reduce((previous, rules) => {
    return {
      runs: combine(previous.runs, rules.runs),
      lifts: combine(previous.lifts, rules.lifts),
      skiAreas: combine(previous.skiAreas, rules.skiAreas)
    };
  }, noRules());
}

function combine(left: ObjectFilterRules, right: ObjectFilterRules) {
  if (left === "hidden" || right === "hidden") {
    return "hidden";
  }

  return left.concat(right);
}

function getActivityFilterRules(filters: MapFilters): MapFilterRules {
  const hasDownhill = !filters.hiddenActivities.includes(Activity.Downhill);
  const hasNordic = !filters.hiddenActivities.includes(Activity.Nordic);
  if (!hasDownhill && !hasNordic) {
    return {
      skiAreas: "hidden",
      lifts: "hidden",
      runs: [["!in", "use", RunUse.Downhill, RunUse.Nordic, RunUse.Skitour]]
    };
  } else if (hasDownhill && !hasNordic) {
    return {
      skiAreas: [["has", "has_downhill"]],
      lifts: [],
      runs: [["in", "use", RunUse.Downhill, RunUse.Skitour]]
    };
  } else if (hasNordic && !hasDownhill) {
    return {
      skiAreas: [["has", "has_nordic"]],
      lifts: "hidden",
      runs: [["in", "use", RunUse.Nordic]]
    };
  } else {
    return noRules();
  }
}

function getElevationFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minElevation) {
    return {
      skiAreas: [[">", "maxElevation", filters.minElevation]],
      lifts: [],
      runs: []
    };
  } else {
    return noRules();
  }
}

function getVerticalFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minVertical) {
    return {
      skiAreas: [[">", "vertical", filters.minVertical]],
      lifts: [],
      runs: []
    };
  } else {
    return noRules();
  }
}

function getRunLengthFilterRules(filters: MapFilters): MapFilterRules {
  if (!filters.minRunLength) {
    return noRules();
  }

  const hasDownhill = !filters.hiddenActivities.includes(Activity.Downhill);
  const hasNordic = !filters.hiddenActivities.includes(Activity.Nordic);

  const rules: any[] = [];
  if (hasDownhill) {
    rules.push([">", "downhillDistance", filters.minRunLength]);
  }
  if (hasNordic) {
    rules.push([">", "nordicDistance", filters.minRunLength]);
  }

  return {
    skiAreas: rules.length > 1 ? [["any"].concat(rules)] : rules,
    lifts: [],
    runs: []
  };
}
