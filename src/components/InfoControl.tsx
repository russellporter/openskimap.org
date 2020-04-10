import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import HighlightManager, { ChartHighlighter } from "./HighlightManager";
import { Info } from "./Info";
import { InfoData } from "./InfoData";
import { panToZoomLevel } from "./SkiAreaInfo";
import { Themed } from "./Themed";
import { getFirstPoint } from "./utils/GeoJSON";

export class InfoControl implements mapboxgl.IControl, ChartHighlighter {
  _container: HTMLDivElement;
  _map: mapboxgl.Map | null = null;
  _eventBus: EventBus;
  _id: string;
  _highlightManager: HighlightManager | null = null;
  _chartHighlightPosition: mapboxgl.LngLat | null = null;
  _panToPositionAfterLoad: boolean = false;

  constructor(info: InfoData, eventBus: EventBus) {
    this._id = info.id;
    this._panToPositionAfterLoad = info.panToPosition === "afterLoad";
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "mapboxgl-ctrl";
  }

  onAdd = (map: mapboxgl.Map) => {
    this._map = map;
    this._highlightManager = new HighlightManager(this._map, this);
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

  getDefaultPosition = (): string => {
    return "top-left";
  };

  setChartHighlightPosition(position: mapboxgl.LngLat | null): void {
    this._chartHighlightPosition = position;
    this.render();
  }

  private render() {
    const map = this._map;
    if (!map) {
      return;
    }
    ReactDOM.render(
      <Themed>
        <Info
          id={this._id}
          eventBus={this._eventBus}
          width={controlWidth(map)}
          chartHighlightPosition={this._chartHighlightPosition}
          onLoadFeature={feature => {
            if (this._panToPositionAfterLoad) {
              const point = getFirstPoint(feature.geometry);
              this._map?.flyTo({
                center: [point[0], point[1]],
                zoom: panToZoomLevel
              });
            }
          }}
          onHoverChartPosition={this._highlightManager!.hoveredChartPosition}
        />
      </Themed>,
      this._container
    );
  }
}
