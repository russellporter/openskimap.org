import * as mapboxgl from "mapbox-gl";
import { throttle } from "throttle-debounce";
import MapFilters from "../MapFilters";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { FilterControl } from "./FilterControl";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import { LegendControl } from "./LegendControl";
import MapFilterManager from "./MapFilterManager";
import { MapInteractionManager } from "./MapInteractionManager";
import { SearchBarControl } from "./SearchBarControl";
import { panToZoomLevel } from "./SkiAreaInfo";

export class Map {
  private map: mapboxgl.Map;

  private eventBus: EventBus;
  private infoControl: InfoControl | null = null;
  private filterControl: FilterControl;
  private legendControl: LegendControl;
  private searchBarControl: SearchBarControl;
  private loaded = false;
  private filtersVisible = false;

  private interactionManager: MapInteractionManager;
  private filterManager: MapFilterManager;

  constructor(
    center: mapboxgl.LngLatLike,
    zoom: number,
    containerID: string | HTMLElement,
    eventBus: EventBus
  ) {
    this.eventBus = eventBus;
    this.map = new mapboxgl.Map({
      container: containerID, // container id
      center: center, // starting position [lng, lat]
      zoom: zoom, // starting zoom,
      hash: true,
      attributionControl: false,
    });
    this.filterControl = new FilterControl(eventBus);
    this.legendControl = new LegendControl(eventBus);
    this.searchBarControl = new SearchBarControl(eventBus);

    this.interactionManager = new MapInteractionManager(this.map, eventBus);
    this.filterManager = new MapFilterManager(this.map);

    this.map.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: "metric",
      }),
      "bottom-left"
    );

    this.map.addControl(this.searchBarControl);

    this.map.addControl(new mapboxgl.AttributionControl());
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    this.map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: false,
      }),
      "bottom-right"
    );

    this.map.once("load", () => {
      this.loaded = true;
    });
  }

  private waitForMapLoaded = (closure: () => void) => {
    if (this.loaded) {
      closure();
    } else {
      this.map.once("load", closure);
    }
  };

  setInfo = (info: InfoData | null) => {
    if (info && info.panToPosition && info.panToPosition !== "afterLoad") {
      this.map.flyTo({ center: info.panToPosition, zoom: panToZoomLevel });
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

  private setFiltersUnthrottled = (filters: MapFilters) => {
    this.waitForMapLoaded(() => {
      this.filterControl.setFilters(filters);
      this.filterManager.setFilters(filters);
      this.updateVisibleSkiAreasCountUnthrottled();
    });
  };

  setFilters = throttle(100, this.setFiltersUnthrottled);

  setFiltersVisible = (visible: boolean) => {
    this.waitForMapLoaded(() => {
      this.filtersVisible = visible;
      this.searchBarControl.setFiltersShown(visible);
      if (visible) {
        this.map.addControl(this.filterControl);
        this.map.on("render", this.updateVisibleSkiAreasCount);
      } else {
        this.map.removeControl(this.filterControl);
        this.map.off("render", this.updateVisibleSkiAreasCount);
      }

      this.updateVisibleSkiAreasCountUnthrottled();
    });
  };

  setLegendVisible = (visible: boolean) => {
    this.waitForMapLoaded(() => {
      if (visible) {
        this.map.addControl(this.legendControl);
      } else {
        this.map.removeControl(this.legendControl);
      }
    });
  };

  getCenter = () => {
    return this.map.getCenter();
  };

  getZoom = () => {
    return this.map.getZoom();
  };

  private updateVisibleSkiAreasCountUnthrottled = () => {
    if (!this.filtersVisible) {
      return;
    }

    this.filterControl.setVisibleSkiAreasCount(
      this.filterManager.getVisibleSkiAreasCount()
    );
  };

  private updateVisibleSkiAreasCount = throttle(
    1000,
    this.updateVisibleSkiAreasCountUnthrottled
  );
}
