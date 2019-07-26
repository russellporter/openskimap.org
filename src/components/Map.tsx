import * as mapboxgl from "mapbox-gl";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import { MapInteractionManager } from "./MapInteractionManager";
import { SearchBarControl } from "./SearchBarControl";

export class Map {
  private map: mapboxgl.Map;

  private data: any;
  private eventBus: EventBus;
  private infoControl: InfoControl | null = null;

  private interactionManager: MapInteractionManager;

  constructor(
    center: mapboxgl.LngLatLike,
    zoom: number,
    containerID: string | Element,
    eventBus: EventBus
  ) {
    this.eventBus = eventBus;
    this.map = new mapboxgl.Map({
      container: containerID, // container id
      center: center, // starting position [lng, lat]
      zoom: zoom, // starting zoom,
      hash: true,
      attributionControl: false
    });

    this.interactionManager = new MapInteractionManager(this.map, eventBus);

    this.map.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: "metric"
      }),
      "bottom-left"
    );

    this.map.addControl(new SearchBarControl(eventBus));

    this.map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }),
      "bottom-right"
    );
  }

  setInfo = (info: InfoData | null) => {
    if (info && info.panToPosition) {
      this.map.panTo(info.panToPosition);
    }
    if (this.infoControl !== null) {
      this.map.removeControl(this.infoControl);
    }
    this.infoControl =
      info === null ? null : new InfoControl(info, this.eventBus);
    if (this.infoControl !== null) {
      this.map.addControl(this.infoControl);
    }
  };

  setStyle = (style: MapStyle) => {
    this.map.setStyle(style);
  };

  getCenter = () => {
    return this.map.getCenter();
  };

  getZoom = () => {
    return this.map.getZoom();
  };
}
