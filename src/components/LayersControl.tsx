import * as maplibregl from "maplibre-gl";
import EventBus from "./EventBus";

export class LayersControl implements maplibregl.IControl {
  _container: HTMLDivElement;
  _button: HTMLButtonElement;
  _map: maplibregl.Map | undefined;
  _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this._button = document.createElement("button");
    this._button.className = "maplibregl-ctrl-icon";
    this._button.type = "button";
    this._button.setAttribute("aria-label", "Layers");
    this._button.title = "Layers";
    
    // Create SVG icon for layers
    this._button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16zm0-11.47L17.74 9 12 13.47 6.26 9 12 4.53z"/>
      </svg>
    `;

    this._container.appendChild(this._button);
    this._container.addEventListener("contextmenu", (e) => e.preventDefault());
    this._button.addEventListener("click", this._onButtonClick.bind(this));
  }

  onAdd = (map: maplibregl.Map) => {
    this._map = map;
    return this._container;
  };

  onRemove = () => {
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = undefined;
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "bottom-right";
  };

  _onButtonClick = () => {
    this._eventBus.openLayers();
  };
}