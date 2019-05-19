import EventBus from "./EventBus";

export class MapInteractionManager {
  private map: mapboxgl.Map;
  private eventBus: EventBus;

  constructor(map: mapboxgl.Map, eventBus: EventBus) {
    this.map = map;
    this.eventBus = eventBus;

    map.on("load", () => {
      this.attachListeners();
    });
  }

  private attachListeners() {
    const skiAreaLayers = [
      "operating-downhill-nordic-ski-area-icons-1",
      "operating-downhill-nordic-ski-area-icons-2",
      "operating-downhill-ski-area-icons",
      "operating-nordic-ski-area-icons",
      "other-operating-ski-area-icons",
      "other-ski-area-icons",
      "ski-area-labels"
    ];

    const style = this.map.getStyle();

    const tappableLayers = (style.layers || [])
      .filter((layer: any) => layer.id.indexOf("tappable") !== -1)
      .map((layer: any) => layer.id)
      // Prioritization of clicks: ski area, ski lift, ski run (linear),
      // ski run (area). Need to reverse the order so lowest priority layers
      // are registered first (and overridden by later event handlers)
      .reverse() as [string];

    const hoverableLayers = skiAreaLayers.concat(tappableLayers);

    tappableLayers.forEach(layer => {
      this.map.on("click", layer, this._onClickItem);
    });

    hoverableLayers.forEach(layer => {
      this.map.on("mouseenter", layer, () => {
        this.map.getCanvas().style.cursor = "pointer";
      });
      this.map.on("mouseleave", layer, () => {
        this.map.getCanvas().style.cursor = "";
      });
    });

    skiAreaLayers.forEach(layer => {
      this.map.on("click", layer, this._onClickItem);
    });
  }

  _onClickItem = (e: any) => {
    this.eventBus.showInfo({
      id: e.features[0].properties.id,
      panToPosition: null
    });
  };
}
