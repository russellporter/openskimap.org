import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import EventBus from "./EventBus";
import SearchBar from "./SearchBar";
import { Themed } from "./Themed";
import controlWidth from "./controlWidth";

export class SearchBarControl implements mapboxgl.IControl {
  _container: HTMLDivElement;
  _root: ReactDOM.Root;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _filtersShown: boolean = false;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
    this._root = ReactDOM.createRoot(this._container);
  }

  onAdd = (map: mapboxgl.Map) => {
    this._map = map;
    this.render();
    this._map.on("resize", this.render);
    return this._container;
  };

  onRemove = () => {
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
    this._root.render(
      <Themed>
        <SearchBar
          eventBus={this._eventBus}
          width={controlWidth(this._map!)}
          filtersShown={this._filtersShown}
        />
      </Themed>
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
