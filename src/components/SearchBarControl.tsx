import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import SearchBar from "./SearchBar";

const searchIndexURL = "https://tiles.skimap.org/search_index.json";

export class SearchBarControl implements mapboxgl.IControl {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
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

  private render = () => {
    ReactDOM.render(
      <SearchBar
        searchIndexURL={searchIndexURL}
        eventBus={this._eventBus}
        width={controlWidth(this._map!)}
      />,
      this._container
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
