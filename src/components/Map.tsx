import mlcontour from "maplibre-contour";
import { DemSource } from "maplibre-contour/dist/dem-source";
import * as maplibregl from "maplibre-gl";
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
  private map: maplibregl.Map;

  private eventBus: EventBus;
  private infoControl: InfoControl | null = null;
  private filterControl: FilterControl;
  private searchBarControl: SearchBarControl;
  private markers: maplibregl.Marker[];
  private loaded = false;
  private filtersVisible = false;
  private mapScaleControl: maplibregl.ScaleControl;

  private interactionManager: MapInteractionManager;
  private filterManager: MapFilterManager;
  private demSource: DemSource | null = null;

  constructor(
    center: maplibregl.LngLatLike,
    zoom: number,
    containerID: string | HTMLElement,
    eventBus: EventBus
  ) {
    this.eventBus = eventBus;
    this.map = new maplibregl.Map({
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

    this.mapScaleControl = new maplibregl.ScaleControl({
      maxWidth: 80,
    });

    this.map.addControl(this.searchBarControl);
    this.map.addControl(this.mapScaleControl, "bottom-left");

    this.map.addControl(
      new maplibregl.AttributionControl({ customAttribution: [] }),
      "bottom-right"
    );
    this.map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    this.map.addControl(
      new maplibregl.NavigationControl({
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
        this.waitForMapLoaded(() => {
          this.updateContourLayers(unitSystem);
        });
        this.updateScaleControlUnits(unitSystem);
      },
      triggerWhenInitialized: true,
    });
  }

  private updateContourLayers(unitSystem: UnitSystem) {
    if (!this.demSource) {
      this.demSource = new mlcontour.DemSource({
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        encoding: "terrarium",
        maxzoom: 15,
        worker: true,
        cacheSize: 100,
        timeoutMs: 10000,
      });

      this.demSource.setupMaplibre(maplibregl);
    }

    // If there is already a terrain source in the map style, it's updated to use the same source to avoid double loading.
    const terrainSource: maplibregl.RasterDEMTileSource | undefined =
      this.map.getSource("terrain");
    if (terrainSource) {
      terrainSource.setTiles([this.demSource.sharedDemProtocolUrl]);
    }

    const contourTiles = [
      this.demSource.contourProtocolUrl({
        multiplier: this.getContourMultiplier(unitSystem),
        thresholds: {
          11: [200, 1000],
          12: [100, 500],
          13: [20, 100],
          15: [10, 100],
        },
        // Reduces the amount of tiles that need to be loaded and rendered.
        overzoom: 1,
        contourLayer: "contours",
        elevationKey: "ele",
        levelKey: "level",
      }),
    ];

    const contourSource: maplibregl.VectorTileSource | undefined =
      this.map.getSource("contours");
    if (contourSource) {
      // Update existing source with new tiles for unit system
      contourSource.setTiles(contourTiles);
    } else {
      // Add new source
      this.map.addSource("contours", {
        type: "vector",
        tiles: contourTiles,
        maxzoom: 15,
      });
    }

    if (!this.map.getLayer("contour-lines")) {
      this.map.addLayer({
        id: "contour-lines",
        type: "line",
        source: "contours",
        "source-layer": "contours",
        paint: {
          "line-color": "rgba(0,0,0, 10%)",
          "line-width": ["match", ["get", "level"], 1, 1, 0.5],
        },
      });
    }

    const contourLabelsLayer = this.map.getLayer("contour-labels");
    if (contourLabelsLayer) {
      // Update existing layer text field for unit system
      this.map.setLayoutProperty(
        "contour-labels",
        "text-field",
        this.getContourTextFieldExpression(unitSystem)
      );
    } else {
      // Add new layer
      this.map.addLayer({
        id: "contour-labels",
        type: "symbol",
        source: "contours",
        "source-layer": "contours",
        filter: [">", ["get", "level"], 0],
        paint: {
          "text-halo-color": "white",
          "text-halo-width": 1,
        },
        layout: {
          "symbol-placement": "line",
          "text-anchor": "center",
          "text-size": 10,
          "text-field": this.getContourTextFieldExpression(unitSystem),
          "text-font": ["Noto Sans Regular"],
        },
      });
    }
  }

  private updateScaleControlUnits(unitSystem: UnitSystem) {
    this.mapScaleControl.setUnit(unitSystem);
  }

  private getContourMultiplier(unitSystem: UnitSystem): number {
    return unitSystem === "imperial" ? 3.28084 : 1;
  }

  private getContourTextFieldExpression(
    unitSystem: UnitSystem
  ): maplibregl.ExpressionSpecification {
    const unit = unitSystem === "imperial" ? " ft" : " m";
    return ["concat", ["get", "ele"], unit];
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

  flyTo = (center: maplibregl.LngLatLike) => {
    this.map.flyTo({ center: center, zoom: panToZoomLevel });
  };

  setStyle = (style: MapStyle) => {
    this.map.once("style.load", () => {
      this.updateContourLayers(getUnitSystem_NonReactive());
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
      const maplibreMarker = new maplibregl.Marker()
        .setLngLat([marker.coordinates[0], marker.coordinates[1]])
        .addTo(this.map);
      this.markers.push(maplibreMarker);
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
