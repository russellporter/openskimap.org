import * as maplibregl from "maplibre-gl";
import * as ReactDOM from "react-dom/client";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import { Info } from "./Info";
import { InfoData } from "./InfoData";
import { Themed } from "./Themed";
import { UnitSystemManager } from "./UnitSystemManager";

export class InfoControl implements maplibregl.IControl {
  _container: HTMLDivElement;
  _map: maplibregl.Map | null = null;
  _eventBus: EventBus;
  _info: InfoData;
  _root: ReactDOM.Root | null = null;

  constructor(info: InfoData, eventBus: EventBus) {
    this._info = info;
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl";
  }

  updateInfo = (info: InfoData) => {
    this._info = info;
    this.render();
  };

  onAdd = (map: maplibregl.Map) => {
    this._root = ReactDOM.createRoot(this._container);
    this._map = map;

    this.render();
    this._map.on("resize", this.render);
    return this._container;
  };

  onRemove = () => {
    this._root?.unmount();
    this._root = null;

    this._map!.off("resize", this.render);
    const parent = this._container.parentNode;
    parent && parent.removeChild(this._container);
    this._map = null;
  };

  getDefaultPosition = (): maplibregl.ControlPosition => {
    return "top-left";
  };

  private render = () => {
    const map = this._map;
    if (!map) {
      return;
    }

    this._root?.render(
      <Themed>
        <UnitSystemManager
          render={(unitSystem) => (
            <Info
              id={this._info.id}
              feature={this._info.feature!}
              eventBus={this._eventBus}
              width={controlWidth(map)}
              unitSystem={unitSystem}
              map={map}
            />
          )}
        />
      </Themed>
    );
  };
}
