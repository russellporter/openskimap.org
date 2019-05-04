import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
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
    ReactDOM.render(
      <SearchBar
        searchIndexURL={searchIndexURL}
        eventBus={this._eventBus}
        width={340}
      />,
      this._container
    );
    this._map.on("resize", this._updateSize);
    return this._container;
  };

  onRemove = () => {
    this._map!.off("resize", this._updateSize);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = null;
  };

  _updateSize = () => {
    const margins = 20;
    const width = this._map!.getCanvasContainer().offsetWidth - margins;
    ReactDOM.render(
      <SearchBar
        searchIndexURL={searchIndexURL}
        eventBus={this._eventBus}
        width={width > 340 ? 340 : width}
      />,
      this._container
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
