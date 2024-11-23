import * as mapboxgl from "mapbox-gl";
import { Activity, SkiAreaFeature } from "openskidata-format";
import MapFilters from "../MapFilters";
import assert from "./utils/assert";
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
      [this.selectedLayers(), rules.selected],
    ];

    const rulesByLayer = layersAndRules.reduce(
      (combinedRulesByLayer, layersAndRules) => {
        const layers = layersAndRules[0];
        const rules = layersAndRules[1];

        layers.forEach((layer) => {
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

    const loadedSkiAreas = this.map.querySourceFeatures("openskimap", {
      sourceLayer: "skiareas",
      filter: ["all"].concat(rules),
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
      .filter(
        (layer) => layer.type !== "custom" && layer["source-layer"] === "runs"
      )
      .map((layer) => layer.id);
  };

  private liftLayers = () => {
    return this.layers()
      .filter(
        (layer) => layer.type !== "custom" && layer["source-layer"] === "lifts"
      )
      .map((layer) => layer.id);
  };

  private skiAreaLayers = () => {
    return this.layers()
      .filter(
        (layer) =>
          layer.type !== "custom" && layer["source-layer"] === "skiareas"
      )
      .map((layer) => layer.id);
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

    assert(layer.type !== "custom", "Custom layers are not supported");

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
      runs: [["has", "other"]],
      selected: [],
    };
  } else if (hasDownhill && !hasNordic) {
    return {
      skiAreas: [["has", "has_downhill"]],
      lifts: [],
      runs: [["any", ["has", "downhill"], ["has", "skitour"]]],
      selected: [],
    };
  } else if (hasNordic && !hasDownhill) {
    return {
      skiAreas: [["has", "has_nordic"]],
      lifts: "hidden",
      runs: [["has", "nordic"]],
      selected: [],
    };
  } else {
    return noRules();
  }
}

function getElevationFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minElevation) {
    return {
      skiAreas: [[">", ["get", "maxElevation"], filters.minElevation]],
      lifts: [],
      runs: [],
      selected: [],
    };
  } else {
    return noRules();
  }
}

function getVerticalFilterRules(filters: MapFilters): MapFilterRules {
  if (filters.minVertical) {
    return {
      skiAreas: [[">", ["get", "vertical"], filters.minVertical]],
      lifts: [],
      runs: [],
      selected: [],
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
    rules.push([">", ["get", "downhillDistance"], filters.minRunLength]);
  }
  if (hasNordic) {
    rules.push([">", ["get", "nordicDistance"], filters.minRunLength]);
  }

  return {
    skiAreas: rules.length > 1 ? [["any"].concat(rules)] : rules,
    lifts: [],
    runs: [],
    selected: [],
  };
}

function getSelectedObjectFilterRules(filters: MapFilters): MapFilterRules {
  const rules = noRules();
  if (filters.selectedObjectID) {
    rules.selected = [
      [
        "any",
        ["==", ["get", "id"], filters.selectedObjectID],
        ["in", filters.selectedObjectID, ["get", "skiAreas"]],
      ],
    ];
  } else {
    rules.selected = "hidden";
  }

  return rules;
}
