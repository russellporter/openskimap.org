import * as maplibregl from "maplibre-gl";
import { SkiAreaActivity, SkiAreaFeature } from "openskidata-format";
import MapFilters from "../MapFilters";
export default class MapFiltersManager {
  private map: maplibregl.Map;
  private originalFilters: Map<
    string,
    maplibregl.FilterSpecification | undefined
  > = new Map();
  private activeRules: MapFilterRules = noRules();

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  setFilters = (filters: MapFilters) => {
    const rules = getFilterRules(filters);
    const layersAndRules: [string[], ObjectFilterRules][] = [
      [this.skiAreaLayers(), rules.skiAreas],
      [this.runLayers(), rules.runs],
      [this.liftLayers(), rules.lifts],
      [this.selectedLayers(), rules.selected],
    ];
    const rulesByLayer = layersAndRules.reduce(
      (combinedRulesByLayer, layersAndRules) => {
        const layers = layersAndRules[0];
        const rules = layersAndRules[1];
        layers.forEach((layer) => {
          combinedRulesByLayer.set(
            layer,
            combine(rules, combinedRulesByLayer.get(layer) || ["boolean", true])
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

    let filter: maplibregl.FilterSpecification | null = null;
    if (rules && typeof rules !== "string") {
      filter = rules;
    }

    const loadedSkiAreas = this.map.querySourceFeatures("openskimap", {
      sourceLayer: "skiareas",
      filter: filter || undefined,
    });

    const bounds = this.map.getBounds();

    // For unknown reasons, the same ski area is often returned twice from querySourceFeatures.
    // Also querySourceFeatures can return ski areas that are slightly off screen,
    const skiAreaIDs = new Set(
      loadedSkiAreas
        .filter(
          (skiArea) =>
            skiArea.geometry.type === "Point" &&
            bounds.contains(skiArea.geometry.coordinates as [number, number])
        )
        .map((skiArea) => skiArea.properties as SkiAreaFeature)
        .map((skiAreaProperties) => skiAreaProperties.id)
    );

    return skiAreaIDs.size;
  };

  private runLayers = () => {
    return this.layers()
      .filter((layer) => (layer as any)["source-layer"] === "runs")
      .map((layer) => layer.id);
  };

  private liftLayers = () => {
    return this.layers()
      .filter((layer) => (layer as any)["source-layer"] === "lifts")
      .map((layer) => layer.id);
  };

  private skiAreaLayers = () => {
    return this.layers()
      .filter((layer) => (layer as any)["source-layer"] === "skiareas")
      .map((layer) => layer.id);
  };

  private selectedLayers = () => {
    return ["selected-run", "selected-lift"];
  };

  private layers = () => {
    return this.map.getStyle().layers || [];
  };

  private setFilterOverride = (layerName: string, rules: ObjectFilterRules) => {
    const layer = this.map.getLayer(layerName);
    if (!layer) {
      return;
    }

    console.assert(layer.type !== "custom", "Custom layers are not supported");

    if (rules === "hidden") {
      this.map.setLayoutProperty(layer.id, "visibility", "none");
      return;
    } else {
      this.map.setLayoutProperty(layer.id, "visibility", "visible");
    }

    if (!this.originalFilters.has(layerName)) {
      this.originalFilters.set(layerName, layer.filter || undefined);
    }

    const originalRules = this.originalFilters.get(layerName) || null;

    this.map.setFilter(
      layerName,
      this.finalRulesForLayer(layerName, originalRules, rules)
    );
  };

  private finalRulesForLayer = (
    layerName: string,
    originalRules: maplibregl.FilterSpecification | undefined | null,
    overrideRules: maplibregl.FilterSpecification
  ): maplibregl.FilterSpecification | null => {
    if (Array.isArray(overrideRules) && overrideRules.length == 0) {
      return originalRules || null;
    }

    if (this.selectedLayers().includes(layerName)) {
      return overrideRules;
    }

    if (!originalRules) {
      return overrideRules;
    }

    // Combine original and override rules with "all"
    return ["all", originalRules, overrideRules] as any;
  };
}

type ObjectFilterRules = maplibregl.ExpressionFilterSpecification | "hidden";

interface MapFilterRules {
  runs: ObjectFilterRules;
  skiAreas: ObjectFilterRules;
  lifts: ObjectFilterRules;
  selected: ObjectFilterRules;
}

function noRules(): MapFilterRules {
  return {
    runs: ["boolean", true],
    skiAreas: ["boolean", true],
    lifts: ["boolean", true],
    selected: ["boolean", true],
  };
}

function getFilterRules(filters: MapFilters): MapFilterRules {
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

function combine(
  left: ObjectFilterRules,
  right: ObjectFilterRules
): ObjectFilterRules {
  if (left === "hidden" || right === "hidden") {
    return "hidden";
  }

  if (!left && !right) return ["boolean", true];
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
      selected: ["boolean", true],
    };
  } else if (hasDownhill && !hasNordic) {
    return {
      skiAreas: ["has", "has_downhill"],
      lifts: ["boolean", true],
      runs: ["any", ["has", "downhill"], ["has", "skitour"]],
      selected: ["boolean", true],
    };
  } else if (hasNordic && !hasDownhill) {
    return {
      skiAreas: ["has", "has_nordic"],
      lifts: "hidden",
      runs: ["has", "nordic"],
      selected: ["boolean", true],
    };
  } else {
    return noRules();
  }
}

function getElevationFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minElevation) {
    return {
      skiAreas: [">", ["get", "maxElevation"], filters.minElevation],
      lifts: ["boolean", true],
      runs: ["boolean", true],
      selected: ["boolean", true],
    };
  } else {
    return noRules();
  }
}

function getVerticalFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minVertical) {
    return {
      skiAreas: [">", ["get", "vertical"], filters.minVertical],
      lifts: ["boolean", true],
      runs: ["boolean", true],
      selected: ["boolean", true],
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

  let skiAreasFilter: maplibregl.FilterSpecification = ["boolean", true];
  if (rules.length > 1) {
    skiAreasFilter = ["any", ...rules];
  } else if (rules.length === 1) {
    skiAreasFilter = rules[0];
  }

  return {
    skiAreas: skiAreasFilter,
    lifts: ["boolean", true],
    runs: ["boolean", true],
    selected: ["boolean", true],
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
    rules.selected = "hidden";
  }

  return rules;
}
