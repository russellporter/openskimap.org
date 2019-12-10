import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import MapFilters from "../MapFilters";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import { FilterForm } from "./FilterForm";

export class FilterControl implements mapboxgl.IControl {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _filters: MapFilters = { hiddenActivities: [] };

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

  setFilters = (filters: MapFilters) => {
    this._filters = filters;
    this.render();
  };

  private render = () => {
    ReactDOM.render(
      <FilterForm
        eventBus={this._eventBus}
        filters={this._filters}
        width={controlWidth(this._map!)}
      />,
      this._container
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
