import * as maplibregl from "maplibre-gl";

export class LogoControl implements maplibregl.IControl {
  _container: HTMLDivElement;
  _map: maplibregl.Map | undefined;

  constructor() {
    this._container = document.createElement("div");
    this._container.className = "logo-control maplibregl-ctrl";

    const link = document.createElement("a");
    link.className = "logo-control-link";
    link.target = "_blank";
    link.href =
      "https://openskimap.org" + window.location.search + window.location.hash;
    link.addEventListener("click", () => {
      link.href =
        "https://openskimap.org" +
        window.location.search +
        window.location.hash;
    });

    const prefix = document.createElement("span");
    prefix.className = "logo-control-prefix";
    prefix.textContent = "Map by ";
    link.appendChild(prefix);

    const text = document.createElement("span");
    text.className = "logo-control-text";
    text.textContent = "OpenSkiMap.org";
    link.appendChild(text);

    this._container.appendChild(link);
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
}
