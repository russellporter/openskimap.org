import * as maplibregl from "maplibre-gl";
import * as ReactDOM from "react-dom/client";
import EventBus from "./EventBus";
import SearchBar from "./SearchBar";
import { Themed } from "./Themed";
import controlWidth from "./controlWidth";

export class SearchBarControl implements maplibregl.IControl {
  _container: HTMLDivElement;
  _root: ReactDOM.Root | null = null;
  _map: maplibregl.Map | null = null;
  _eventBus: EventBus;
  _isEmbedded: boolean;
  constructor(eventBus: EventBus, isEmbedded: boolean) {
    this._eventBus = eventBus;
    this._isEmbedded = isEmbedded;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl";
  }

  onAdd = (map: maplibregl.Map) => {
    this._root = ReactDOM.createRoot(this._container);
    this._map = map;
    this.render();
    this._map.on("resize", this.render);
    return this._container;
  };

  onRemove = () => {
    this._root?.unmount();
    this._root = null;
    this._map!.off("resize", this.render);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = null;
  };

  expandSearch = () => {
    // Defer to avoid being overridden by useDetectClickOutside
    // which sets expanded=false in the same click event
    setTimeout(() => {
      document.dispatchEvent(new Event("expand-search"));
    }, 0);
  };

  private render = () => {
    const mapWidth = this._map!.getCanvasContainer().offsetWidth;
    const shouldCollapse = this._isEmbedded || mapWidth < 600;
    this._root?.render(
      <Themed>
        <SearchBar
          eventBus={this._eventBus}
          width={controlWidth(this._map!)}
          shouldCollapse={shouldCollapse}
        />
      </Themed>
    );
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "top-left";
  };
}
