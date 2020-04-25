import { debounce } from "throttle-debounce";
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
    const skiAreaLayers = new Set([
      "operating-downhill-nordic-ski-area-icons-1",
      "operating-downhill-nordic-ski-area-icons-2",
      "operating-downhill-ski-area-icons",
      "operating-nordic-ski-area-icons",
      "other-operating-ski-area-icons",
      "other-ski-area-icons",
      "ski-area-labels",
    ]);

    const style = this.map.getStyle();

    const tappableLayers = (style.layers || [])
      .filter(
        (layer: any) =>
          layer.id.indexOf("tappable") !== -1 || skiAreaLayers.has(layer.id)
      )
      .map((layer: any) => layer.id)
      // Register tappable layers in a specific order so the top-most layers trigger the click handler first.
      // If there are two objects on top of each other in two layers, the click on the object underneath will be ignored by to the debouncing below.
      .reverse();

    let mouseLayerCount = 0;

    tappableLayers.forEach((layer) => {
      this.map.on("click", layer, this._onClickItem);
      this.map.on("mouseenter", layer, () => {
        mouseLayerCount += 1;
        this.map.getCanvas().style.cursor = "pointer";
      });
      this.map.on("mouseleave", layer, () => {
        mouseLayerCount -= 1;
        if (mouseLayerCount === 0) {
          this.map.getCanvas().style.cursor = "";
        }
      });
    });
  }

  _onClickItemUnthrottled = (e: any) => {
    this.eventBus.showInfo({
      id: e.features[0].properties.id,
      panToPosition: null,
    });
  };

  _onClickItem = debounce(10, true, this._onClickItemUnthrottled);
}
