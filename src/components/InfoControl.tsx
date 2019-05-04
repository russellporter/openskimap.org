import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import EventBus from "./EventBus";
import { Info } from "./Info";
import { InfoData } from "./InfoData";

export class InfoControl implements mapboxgl.IControl {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _lid: string;

  constructor(info: InfoData, eventBus: EventBus) {
    this._lid = info.lid;
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
  }

  onAdd = (map: mapboxgl.Map) => {
    this._map = map;
    ReactDOM.render(
      <Info lid={this._lid} eventBus={this._eventBus} width={400} />,
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
      <Info
        lid={this._lid}
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
