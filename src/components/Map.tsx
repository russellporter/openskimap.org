import * as mapboxgl from "mapbox-gl";
import { throttle } from "throttle-debounce";
import MapFilters from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import { FilterControl } from "./FilterControl";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import MapFilterManager from "./MapFilterManager";
import { MapInteractionManager } from "./MapInteractionManager";
import { SearchBarControl } from "./SearchBarControl";
import { panToZoomLevel } from "./SkiAreaInfo";
import {
  addUnitSystemChangeListener_NonReactive,
  getUnitSystem_NonReactive,
} from "./UnitSystemManager";
import { UnitSystem } from "./utils/UnitHelpers";

export class Map {
  private map: mapboxgl.Map;

  private eventBus: EventBus;
  private infoControl: InfoControl | null = null;
  private filterControl: FilterControl;
  private searchBarControl: SearchBarControl;
  private markers: mapboxgl.Marker[];
  private loaded = false;
  private filtersVisible = false;
  private mapScaleControl: mapboxgl.ScaleControl;

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
    this.markers = [];
    this.filterControl = new FilterControl(eventBus);
    this.searchBarControl = new SearchBarControl(eventBus);

    this.interactionManager = new MapInteractionManager(this.map, eventBus);
    this.filterManager = new MapFilterManager(this.map);

    this.mapScaleControl = new mapboxgl.ScaleControl({
      maxWidth: 80,
    });

    this.map.addControl(this.searchBarControl);
    this.map.addControl(this.mapScaleControl, "bottom-left");

    this.map.addControl(new mapboxgl.AttributionControl(), "bottom-right");
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

    addUnitSystemChangeListener_NonReactive({
      onUnitSystemChange: (unitSystem) => {
        this.updateContourLabelUnits(unitSystem);
        this.updateScaleControlUnits(unitSystem);
      },
      triggerWhenInitialized: true,
    });
  }

  private updateContourLabelUnits(unitSystem: UnitSystem) {
    this.waitForMapLoaded(() => {
      const contourLabel = this.map.getLayer("contour-label");
      if (!contourLabel) {
        return;
      }
      switch (unitSystem) {
        case "imperial":
          this.map.setLayoutProperty("contour-label", "text-field", [
            "concat",
            ["to-string", ["*", ["get", "ele"], 3.3]],
            " ft",
          ]);
          break;
        case "metric":
          this.map.setLayoutProperty("contour-label", "text-field", [
            "concat",
            ["get", "ele"],
            " m",
          ]);
          break;
      }
    });
  }

  private updateScaleControlUnits(unitSystem: UnitSystem) {
    this.mapScaleControl.setUnit(unitSystem);
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
      this.flyTo(info.panToPosition);
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

  flyTo = (center: mapboxgl.LngLatLike) => {
    this.map.flyTo({ center: center, zoom: panToZoomLevel });
  };

  setStyle = (style: MapStyle) => {
    this.map.once("style.load", () => {
      this.updateContourLabelUnits(getUnitSystem_NonReactive());
    });

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

  getCenter = () => {
    return this.map.getCenter();
  };

  getZoom = () => {
    return this.map.getZoom();
  };

  setMarkers = (markers: MapMarker[]) => {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
    for (const marker of markers) {
      const mapboxMarker = new mapboxgl.Marker()
        .setLngLat([marker.coordinates[0], marker.coordinates[1]])
        .addTo(this.map);
      this.markers.push(mapboxMarker);
    }
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
