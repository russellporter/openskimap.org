import { Activity, RunUse } from "openskidata-format";
import MapFilters from "../MapFilters";

export default class MapFiltersManager {
  private map: mapboxgl.Map;
  private originalFilters: Map<string, any[] | undefined> = new Map();
  private activeRules: MapFilterRules = noRules();

  constructor(map: mapboxgl.Map) {
    this.map = map;
  }

  setFilters = (filters: MapFilters) => {
    const rules = getFilterRules(filters);

    const layersAndRules: [string[], ObjectFilterRules][] = [
      [this.skiAreaLayers(), rules.skiAreas],
      [this.runLayers(), rules.runs],
      [this.liftLayers(), rules.lifts],
      [this.selectedLayers(), rules.selected]
    ];

    const rulesByLayer = layersAndRules.reduce(
      (combinedRulesByLayer, layersAndRules) => {
        const layers = layersAndRules[0];
        const rules = layersAndRules[1];

        layers.forEach(layer => {
          combinedRulesByLayer.set(
            layer,
            combine(rules, combinedRulesByLayer.get(layer) || [])
          );
        });
        return combinedRulesByLayer;
      },
      new Map<string, ObjectFilterRules>()
    );

    rulesByLayer.forEach((rules, layer) =>
      this.setFilterOverride(layer, rules)
    );

    this.activeRules = rules;
  };

  getVisibleSkiAreasCount = () => {
    const rules = this.activeRules.skiAreas;
    if (rules === "hidden") {
      return 0;
    }

    return this.map.querySourceFeatures("openskimap", {
      sourceLayer: "skiareas",
      filter: ["all"].concat(rules)
    }).length;
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

  private selectedLayers = () => {
    return ["selected-run", "selected-lift"];
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

    const originalRules = this.originalFilters.get(layerName) || [];

    this.map.setFilter(
      layerName,
      this.finalRulesForLayer(layerName, originalRules, rules)
    );
  };

  private finalRulesForLayer = (
    layerName: string,
    originalRules: any[],
    overrideRules: any[]
  ) => {
    if (overrideRules.length == 0) {
      return originalRules;
    }

    if (this.selectedLayers().includes(layerName)) {
      return ["all"].concat(overrideRules);
    }

    return ["all", originalRules].concat(overrideRules);
  };
}

type ObjectFilterRules = any[] | "hidden";

interface MapFilterRules {
  runs: ObjectFilterRules;
  skiAreas: ObjectFilterRules;
  lifts: ObjectFilterRules;
  selected: ObjectFilterRules;
}

function noRules(): MapFilterRules {
  return { runs: [], skiAreas: [], lifts: [], selected: [] };
}

function getFilterRules(filters: MapFilters): MapFilterRules {
  return [
    getActivityFilterRules(filters),
    getElevationFilterRules(filters),
    getVerticalFilterRules(filters),
    getRunLengthFilterRules(filters),
    getSelectedObjectFilterRules(filters)
  ].reduce((previous, rules) => {
    return {
      runs: combine(previous.runs, rules.runs),
      lifts: combine(previous.lifts, rules.lifts),
      skiAreas: combine(previous.skiAreas, rules.skiAreas),
      selected: combine(previous.selected, rules.selected)
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
      runs: [["!in", "use", RunUse.Downhill, RunUse.Nordic, RunUse.Skitour]],
      selected: []
    };
  } else if (hasDownhill && !hasNordic) {
    return {
      skiAreas: [["has", "has_downhill"]],
      lifts: [],
      runs: [["in", "use", RunUse.Downhill, RunUse.Skitour]],
      selected: []
    };
  } else if (hasNordic && !hasDownhill) {
    return {
      skiAreas: [["has", "has_nordic"]],
      lifts: "hidden",
      runs: [["in", "use", RunUse.Nordic]],
      selected: []
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
      runs: [],
      selected: []
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
      runs: [],
      selected: []
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
    runs: [],
    selected: []
  };
}

function getSelectedObjectFilterRules(filters: MapFilters): MapFilterRules {
  const rules = noRules();
  if (filters.selectedObjectID) {
    rules.selected = [
      [
        "any",
        ["==", "id", filters.selectedObjectID],
        ["has", "skiArea-" + filters.selectedObjectID]
      ]
    ];
  } else {
    rules.selected = "hidden";
  }

  return rules;
}
