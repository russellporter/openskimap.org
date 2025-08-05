import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";
import { throttle } from "throttle-debounce";
import MapFilters from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MAP_STYLE_URLS, MapStyle } from "../MapStyle";
import { EsriAttribution } from "./EsriAttribution";
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
  private demSource: InstanceType<typeof mlcontour.DemSource> | null = null;
  private esriAttribution: EsriAttribution | null = null;
  private attributionControl: maplibregl.AttributionControl;
  private currentStyle: MapStyle | null = null;

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

    this.attributionControl = new maplibregl.AttributionControl({
      customAttribution: [
        '<a href="?legal" id="legal-attribution-link">Legal</a>',
      ],
    });
    this.map.addControl(this.attributionControl, "bottom-right");
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

      // Initialize Esri attribution for satellite imagery
      this.esriAttribution = new EsriAttribution(
        this.map,
        "https://static.arcgis.com/attribution/World_Imagery",
        this.attributionControl
      );
      this.esriAttribution.autoManage();

      // Add click handler for Legal attribution link
      const legalLink = document.getElementById("legal-attribution-link");
      if (legalLink) {
        legalLink.addEventListener("click", (e) => {
          e.preventDefault();
          this.eventBus.openLegal();
        });
      }
    });

    addUnitSystemChangeListener_NonReactive({
      onUnitSystemChange: (unitSystem) => {
        this.waitForMapLoaded(() => {
          if (this.currentStyle) {
            // Has a side-effect of applying some unit specific styling
            this.setStyle(this.currentStyle);
          }
        });
        this.updateScaleControlUnits(unitSystem);
      },
      triggerWhenInitialized: true,
    });
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
    this.currentStyle = style;
    this.map.setStyle(MAP_STYLE_URLS[style], {
      transformStyle: (_, newStyle) => {
        const unitSystem = getUnitSystem_NonReactive();
        
        // Show/hide layers based on unit system
        const updatedLayers = newStyle.layers.map((layer) => {
          if (layer.id.endsWith('-metric')) {
            return {
              ...layer,
              layout: {
                ...layer.layout,
                visibility: (unitSystem === 'metric' ? 'visible' : 'none') as 'visible' | 'none',
              },
            };
          } else if (layer.id.endsWith('-imperial')) {
            return {
              ...layer,
              layout: {
                ...layer.layout,
                visibility: (unitSystem === 'imperial' ? 'visible' : 'none') as 'visible' | 'none',
              },
            };
          }
          return layer;
        });

        if (style == MapStyle.Terrain) {
          // Apply contour layers to new style

          if (!this.demSource) {
            this.demSource = new mlcontour.DemSource({
              url: "https://tiles.openskimap.org/dynamic/data/merged-terrain/{z}/{x}/{y}.webp",
              encoding: "mapbox",
              maxzoom: 16,
              worker: true,
              cacheSize: 100,
              timeoutMs: 10000,
            });

            this.demSource.setupMaplibre(maplibregl);
          }

          // Create contour tiles with current unit system
          const contourTiles = [
            this.demSource.contourProtocolUrl({
              multiplier: this.getContourMultiplier(unitSystem),
              thresholds: {
                11: [200, 1000],
                12: [100, 500],
                // ideally this would be a higher zoom like 14-15 but the terrain tiles are only available globally up to zoom 13
                13: [10, 100],
              },
              // Reduces the amount of tiles that need to be loaded and rendered.
              overzoom: 1,
              contourLayer: "contours",
              elevationKey: "ele",
              levelKey: "level",
            }),
          ];

          // Modify terrain source if it exists to use the same demSource to avoid double loading
          const updatedSources = { ...newStyle.sources };
          if (
            updatedSources.terrain &&
            updatedSources.terrain.type === "raster-dem"
          ) {
            updatedSources.terrain = {
              ...updatedSources.terrain,
              tiles: [this.demSource.sharedDemProtocolUrl],
            };
          }

          // Add contours source to the new style
          const modifiedStyle = {
            ...newStyle,
            sources: {
              ...updatedSources,
              contours: {
                type: "vector" as const,
                tiles: contourTiles,
                maxzoom: 16,
              },
            },
            layers: [
              ...updatedLayers,
              {
                id: "contour-lines",
                type: "line" as const,
                source: "contours",
                "source-layer": "contours",
                paint: {
                  "line-color": "rgba(0,0,0, 10%)",
                  "line-width": [
                    "match",
                    ["get", "level"],
                    1,
                    1,
                    0.5,
                  ] as maplibregl.ExpressionSpecification,
                },
              },
              {
                id: "contour-labels",
                type: "symbol" as const,
                source: "contours",
                "source-layer": "contours",
                filter: [
                  ">",
                  ["get", "level"],
                  0,
                ] as maplibregl.ExpressionSpecification,
                paint: {
                  "text-halo-color": "white",
                  "text-halo-width": 1,
                },
                layout: {
                  "symbol-placement": "line" as const,
                  "text-anchor": "center" as const,
                  "text-size": 10,
                  "text-field": this.getContourTextFieldExpression(unitSystem),
                  "text-font": ["Noto Sans Regular"],
                },
              },
            ],
          };

          return modifiedStyle;
        }
        
        // For non-terrain styles, still apply unit-based layer visibility
        return {
          ...newStyle,
          layers: updatedLayers,
        };
      },
    });
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
