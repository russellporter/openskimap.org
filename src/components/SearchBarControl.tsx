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
  _filtersShown: boolean = false;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
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

  setFiltersShown = (shown: boolean) => {
    this._filtersShown = shown;
    this.render();
  };

  private render = () => {
    this._root?.render(
      <Themed>
        <SearchBar
          eventBus={this._eventBus}
          width={controlWidth(this._map!)}
          filtersShown={this._filtersShown}
        />
      </Themed>
    );
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "top-left";
  };
}
