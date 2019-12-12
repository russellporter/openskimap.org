import * as mapboxgl from "mapbox-gl";
import MapFilters from "../MapFilters";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { FilterControl } from "./FilterControl";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import MapFilterManager from "./MapFilterManager";
import { MapInteractionManager } from "./MapInteractionManager";
import { SearchBarControl } from "./SearchBarControl";

export class Map {
  private map: mapboxgl.Map;

  private data: any;
  private eventBus: EventBus;
  private infoControl: InfoControl | null = null;
  private filterControl: FilterControl;
  private searchBarControl: SearchBarControl;

  private interactionManager: MapInteractionManager;
  private filterManager: MapFilterManager;

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
      attributionControl: false,
      pitchWithRotate: false
    });
    this.filterControl = new FilterControl(eventBus);
    this.searchBarControl = new SearchBarControl(eventBus);

    this.interactionManager = new MapInteractionManager(this.map, eventBus);
    this.filterManager = new MapFilterManager(this.map);

    this.map.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: "metric"
      }),
      "bottom-left"
    );

    this.map.addControl(this.searchBarControl);

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

    this.map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: false
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

  setFilters = (filters: MapFilters) => {
    this.filterControl.setFilters(filters);
    this.filterManager.setFilters(filters);
  };

  setFiltersVisible = (visible: boolean) => {
    this.searchBarControl.setFiltersShown(visible);
    if (visible) {
      this.map.addControl(this.filterControl);
    } else {
      this.map.removeControl(this.filterControl);
    }
  };

  getCenter = () => {
    return this.map.getCenter();
  };

  getZoom = () => {
    return this.map.getZoom();
  };
}
