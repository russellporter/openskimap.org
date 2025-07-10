import * as maplibregl from "maplibre-gl";
import { MapStyle } from "../MapStyle";

export class MapStyleControl implements maplibregl.IControl {
  _enabled: boolean = false;
  _satelliteButton: HTMLButtonElement;
  _container: HTMLDivElement;
  _map: maplibregl.Map | undefined;

  constructor() {
    this._container = document.createElement("div");
    this._container.className =
      "maplibregl-ctrl maplibregl-ctrl-group openskimap-style-control";

    this._container.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    this._satelliteButton = document.createElement("button");
    this._container.appendChild(this._satelliteButton);
    this._satelliteButton.type = "button";
    this._satelliteButton.textContent = "Satellite";
    this._satelliteButton.setAttribute("aria-label", "Satellite Layer");
    this._satelliteButton.addEventListener(
      "click",
      this._onToggleButton.bind(this)
    );
  }

  onAdd = (map: maplibregl.Map) => {
    this._map = map;
    this._setEnabled(false);

    return this._container;
  };

  onRemove = () => {
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = undefined;
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "top-right";
  };

  _setEnabled = (enabled: boolean) => {
    const map = this._map;
    this._enabled = enabled;
    this._satelliteButton.setAttribute(
      "aria-pressed",
      enabled ? "true" : "false"
    );
    if (enabled) {
      this._satelliteButton.classList.add("openskimap-style-enabled");
      map && map.setStyle(MapStyle.Satellite);
    } else {
      this._satelliteButton.classList.remove("openskimap-style-enabled");
      map && map.setStyle(MapStyle.Terrain);
    }
  };

  _onToggleButton = () => {
    this._setEnabled(!this._enabled);
  };
}
