import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import { Legend } from "./Legend";
import { Themed } from "./Themed";

export class LegendControl implements mapboxgl.IControl {
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
    this._map && this._map.off("resize", this.render);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = null;
  };

  private render = () => {
    if (!this._container.isConnected) {
      return;
    }
    ReactDOM.render(
      <Themed>
        <Legend eventBus={this._eventBus} width={controlWidth(this._map!)} />
      </Themed>,
      this._container
    );
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };
}
