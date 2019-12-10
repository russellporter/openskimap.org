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

interface MapFilterRules {
  runs: any[] | "hidden";
  skiAreas: any[] | "hidden";
  lifts: any[] | "hidden";
}

function getFilterRules(filters: MapFilters): MapFilterRules {
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
    return {
      skiAreas: [],
      lifts: [],
      runs: []
    };
  }
}
