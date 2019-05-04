import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import EventBus from "./EventBus";
import HighlightManager, { ChartHighlighter } from "./HighlightManager";
import { Info } from "./Info";
import { InfoData } from "./InfoData";

export class InfoControl implements mapboxgl.IControl, ChartHighlighter {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _lid: string;
  _highlightManager: HighlightManager | null = null;
  _width: number = 400;
  _chartHighlightPosition: mapboxgl.LngLatLike | null = null;

  constructor(info: InfoData, eventBus: EventBus) {
    this._lid = info.lid;
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
  }

  onAdd = (map: mapboxgl.Map) => {
    this._map = map;
    this._highlightManager = new HighlightManager(this._map, this);
    this._map.on("resize", this._updateSize);
    this.setSelected(true);
    this.render();
    return this._container;
  };

  onRemove = () => {
    this._map!.off("resize", this._updateSize);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this.setSelected(false);
    this._map = null;
  };

  _updateSize = () => {
    const margins = 20;
    this._width = this._map!.getCanvasContainer().offsetWidth - margins;
    this.render();
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
      "lid",
      selected ? this._lid : "-1"
    ]);
    this._map!.setFilter("selected-lift", [
      "==",
      "lid",
      selected ? this._lid : "-1"
    ]);
  }

  private render() {
    ReactDOM.render(
      <Info
        lid={this._lid}
        eventBus={this._eventBus}
        width={this._width}
        chartHighlightPosition={this._chartHighlightPosition}
        onHoverChartPosition={this._highlightManager!.hoveredChartPosition}
      />,
      this._container
    );
  }
}
