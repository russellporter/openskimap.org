import * as maplibregl from "maplibre-gl";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { throttle } from "throttle-debounce";
import { TerrainData, TerrainInspector } from "./TerrainInspector";
import { Themed } from "./Themed";
import { UnitSystemManager } from "./UnitSystemManager";

const isMobile = window.matchMedia("(pointer: coarse)").matches;
const SAMPLE_RADIUS_METERS = 2;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class TerrainInspectorControl implements maplibregl.IControl {
  private _map: maplibregl.Map;
  private _geolocateControl: maplibregl.GeolocateControl;
  private _container: HTMLDivElement;
  private _root: ReactDOM.Root | null = null;
  private _data: TerrainData | null = null;
  private _userLocation: { lng: number; lat: number } | null = null;
  private _lastSampledLocation: { lng: number; lat: number } | null = null;

  constructor(
    map: maplibregl.Map,
    geolocateControl: maplibregl.GeolocateControl
  ) {
    this._map = map;
    this._geolocateControl = geolocateControl;
    this._container = document.createElement("div");
    this._container.style.cssText =
      "position:fixed;bottom:0;left:0;width:100%;pointer-events:none;";
  }

  private _onTrackUserLocationEnd = () => {
    // trackuserlocationend fires both when going to BACKGROUND (camera stops
    // following but GPS continues) and when turning off entirely (OFF). Only
    // clear the location in the OFF case.
    if (this._geolocateControl._watchState === "OFF") {
      this._userLocation = null;
      if (this._data) {
        this._data = { ...this._data, distanceMeters: null };
        this._render();
      }
    }
  };

  private _onGeolocate = (e: GeolocationPosition) => {
    this._userLocation = {
      lng: e.coords.longitude,
      lat: e.coords.latitude,
    };
    if (this._data && this._lastSampledLocation) {
      this._data = {
        ...this._data,
        distanceMeters: haversineDistance(
          this._userLocation.lat,
          this._userLocation.lng,
          this._lastSampledLocation.lat,
          this._lastSampledLocation.lng
        ),
      };
    }
    this._render();
  };

  onAdd = (_map: maplibregl.Map): HTMLElement => {
    this._root = ReactDOM.createRoot(this._container);
    this._render();

    this._geolocateControl.on("geolocate", this._onGeolocate);
    this._geolocateControl.on("trackuserlocationend", this._onTrackUserLocationEnd);

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
    this._geolocateControl.off("geolocate", this._onGeolocate);
    this._geolocateControl.off("trackuserlocationend", this._onTrackUserLocationEnd);

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
    this._lastSampledLocation = { lng, lat };
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

    const distanceMeters = this._userLocation
      ? haversineDistance(
          this._userLocation.lat,
          this._userLocation.lng,
          lat,
          lng
        )
      : null;

    this._data = {
      elevationMeters: elevCenter,
      slopeDegrees,
      slopePercent,
      aspectDegrees,
      distanceMeters,
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
