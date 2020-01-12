import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import SearchBar from "./SearchBar";
import { Themed } from "./Themed";

export class SearchBarControl implements mapboxgl.IControl {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _filtersShown: boolean = false;

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

  setFiltersShown = (shown: boolean) => {
    this._filtersShown = shown;
    this.render();
  };

  private render = () => {
    ReactDOM.render(
      <Themed>
        <SearchBar
          eventBus={this._eventBus}
          width={controlWidth(this._map!)}
          filtersShown={this._filtersShown}
        />
      </Themed>,
      this._container
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
