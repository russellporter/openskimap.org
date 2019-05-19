import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import HighlightManager, { ChartHighlighter } from "./HighlightManager";
import { Info } from "./Info";
import { InfoData } from "./InfoData";

export class InfoControl implements mapboxgl.IControl, ChartHighlighter {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _id: string;
  _highlightManager: HighlightManager | null = null;
  _chartHighlightPosition: mapboxgl.LngLatLike | null = null;

  constructor(info: InfoData, eventBus: EventBus) {
    this._id = info.id;
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
  }

  onAdd = (map: mapboxgl.Map) => {
    this._map = map;
    this._highlightManager = new HighlightManager(this._map, this);
    this.render();
    this._map.on("resize", this.render);
    this.setSelected(true);
    return this._container;
  };

  onRemove = () => {
    this._map!.off("resize", this.render);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this.setSelected(false);
    this._map = null;
  };

  getDefaultPosition = (): string => {
    return "top-left";
  };

  setChartHighlightPosition(position: mapboxgl.LngLatLike | null): void {
    this._chartHighlightPosition = position;
    this.render();
  }

  private setSelected(selected: boolean) {
    this._map!.setFilter("selected-run", [
      "==",
      "id",
      selected ? this._id : "-1"
    ]);
    this._map!.setFilter("selected-lift", [
      "==",
      "id",
      selected ? this._id : "-1"
    ]);
  }

  private render() {
    const map = this._map;
    if (!map) {
      return;
    }
    ReactDOM.render(
      <Info
        id={this._id}
        eventBus={this._eventBus}
        width={controlWidth(map)}
        chartHighlightPosition={this._chartHighlightPosition}
        onHoverChartPosition={this._highlightManager!.hoveredChartPosition}
      />,
      this._container
    );
  }
}
