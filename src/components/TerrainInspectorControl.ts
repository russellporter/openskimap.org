import * as maplibregl from "maplibre-gl";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { throttle } from "throttle-debounce";
import { TerrainData, TerrainInspector } from "./TerrainInspector";
import { Themed } from "./Themed";
import { UnitSystemManager } from "./UnitSystemManager";

const isMobile = window.matchMedia("(pointer: coarse)").matches;
const SAMPLE_RADIUS_METERS = 2;

export class TerrainInspectorControl implements maplibregl.IControl {
  private _map: maplibregl.Map;
  private _container: HTMLDivElement;
  private _root: ReactDOM.Root | null = null;
  private _data: TerrainData | null = null;

  constructor(map: maplibregl.Map) {
    this._map = map;
    this._container = document.createElement("div");
    this._container.style.cssText =
      "position:fixed;bottom:0;left:0;width:100%;pointer-events:none;";
  }

  onAdd = (_map: maplibregl.Map): HTMLElement => {
    this._root = ReactDOM.createRoot(this._container);
    this._render();

    if (isMobile) {
      this._map.on("move", this._onMoveThrottled);
      this._map.on("moveend", this._onMoveEnd);
      // Sample at current center immediately
      this._onMoveEnd();
    } else {
      this._map.on("mousemove", this._onMouseMove);
      this._map.on("mouseout", this._onMouseOut);
    }

    return this._container;
  };

  onRemove = (): void => {
    if (isMobile) {
      this._map.off("move", this._onMoveThrottled);
      this._map.off("moveend", this._onMoveEnd);
    } else {
      this._map.off("mousemove", this._onMouseMove);
      this._map.off("mouseout", this._onMouseOut);
    }

    this._root?.unmount();
    this._root = null;

    const parent = this._container.parentNode;
    if (parent) {
      parent.removeChild(this._container);
    }
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "bottom-left";
  };

  private _onMouseMove = throttle(50, (e: maplibregl.MapMouseEvent) => {
    this._sampleAt(e.lngLat.lng, e.lngLat.lat);
  });

  private _onMouseOut = () => {
    this._data = null;
    this._render();
  };

  private _onMoveThrottled = throttle(100, () => {
    const center = this._map.getCenter();
    this._sampleAt(center.lng, center.lat);
  });

  private _onMoveEnd = () => {
    const center = this._map.getCenter();
    this._sampleAt(center.lng, center.lat);
  };

  private _sampleAt(lng: number, lat: number): void {
    const map = this._map;

    const dLat = SAMPLE_RADIUS_METERS / 111111;
    const dLng = SAMPLE_RADIUS_METERS / (111111 * Math.cos((lat * Math.PI) / 180));

    const elevCenter = map.queryTerrainElevation({ lng, lat });
    const elevN = map.queryTerrainElevation({ lng, lat: lat + dLat });
    const elevS = map.queryTerrainElevation({ lng, lat: lat - dLat });
    const elevE = map.queryTerrainElevation({ lng: lng + dLng, lat });
    const elevW = map.queryTerrainElevation({ lng: lng - dLng, lat });

    if (
      elevCenter === null ||
      elevN === null ||
      elevS === null ||
      elevE === null ||
      elevW === null
    ) {
      this._data = null;
      this._render();
      return;
    }

    const dN = (elevN - elevS) / (2 * SAMPLE_RADIUS_METERS);
    const dE = (elevE - elevW) / (2 * SAMPLE_RADIUS_METERS);

    const slopeRad = Math.atan(Math.sqrt(dN * dN + dE * dE));
    const slopeDegrees = (slopeRad * 180) / Math.PI;
    const slopePercent = Math.tan(slopeRad) * 100;

    const aspectDegrees =
      ((Math.atan2(dE, dN) * 180) / Math.PI + 180) % 360;

    this._data = {
      elevationMeters: elevCenter,
      slopeDegrees,
      slopePercent,
      aspectDegrees,
    };
    this._render();
  }

  private _render = (): void => {
    const data = this._data;
    this._root?.render(
      React.createElement(
        Themed,
        null,
        React.createElement(UnitSystemManager, {
          render: (unitSystem) =>
            React.createElement(TerrainInspector, {
              data,
              unitSystem,
              isMobile,
            }),
        }),
      ),
    );
  };
}
