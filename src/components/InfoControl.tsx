import * as maplibregl from "maplibre-gl";
import * as ReactDOM from "react-dom/client";
import controlWidth from "./controlWidth";
import EventBus from "./EventBus";
import { Info } from "./Info";
import { InfoData } from "./InfoData";
import { panToZoomLevel } from "./SkiAreaInfo";
import { Themed } from "./Themed";
import { UnitSystemManager } from "./UnitSystemManager";
import { getFirstPoint } from "./utils/GeoJSON";

export class InfoControl implements maplibregl.IControl {
  _container: HTMLDivElement;
  _map: maplibregl.Map | null = null;
  _eventBus: EventBus;
  _id: string;
  _panToPositionAfterLoad: boolean = false;
  _root: ReactDOM.Root | null = null;

  constructor(info: InfoData, eventBus: EventBus) {
    this._id = info.id;
    this._panToPositionAfterLoad = info.panToPosition === "afterLoad";
    this._eventBus = eventBus;
    this._container = document.createElement("div");
    this._container.className = "maplibregl-ctrl";
  }

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
              id={this._id}
              eventBus={this._eventBus}
              width={controlWidth(map)}
              unitSystem={unitSystem}
              map={map}
              onLoadFeature={(feature) => {
                if (this._panToPositionAfterLoad) {
                  const point = getFirstPoint(feature.geometry);
                  this._map?.flyTo({
                    center: [point[0], point[1]],
                    zoom: panToZoomLevel,
                  });
                }
              }}
            />
          )}
        />
      </Themed>
    );
  };
}
