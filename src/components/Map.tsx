import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";
import { throttle } from "throttle-debounce";
import MapFilters, { defaultMapFilters } from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MAP_STYLE_URLS, MapStyle, MapStyleOverlay, isSlopeOverlay } from "../MapStyle";
import { Track } from "../utils/TrackParser";
import { CameraPosition, CameraPositionManager } from "../utils/CameraPositionManager";
import { EsriAttribution } from "./EsriAttribution";
import EventBus from "./EventBus";
import { FilterControl } from "./FilterControl";
import { HeadingIndicator } from "./HeadingIndicator";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import { getVisibleSkiAreasCount } from "./MapVisibilityUtils";
import { getFilterRules } from "./MapFilterRules";
import { MapInteractionManager } from "./MapInteractionManager";
import { registerSatelliteTileProtocol } from "./SatelliteTileProtocol";
import { SearchBarControl } from "./SearchBarControl";
import { panToZoomLevel } from "./SkiAreaInfo";
import { SlopeTerrainRenderer } from "./SlopeTerrainRenderer";
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
  private tracks: Track[] = [];
  private loaded = false;
  private filtersVisible = false;
  private mapScaleControl: maplibregl.ScaleControl;

  private interactionManager: MapInteractionManager;
  private demSource: InstanceType<typeof mlcontour.DemSource>;
  private esriAttribution: EsriAttribution | null = null;
  private attributionControl: maplibregl.AttributionControl;
  private geolocateControl: maplibregl.GeolocateControl;
  private headingIndicator: HeadingIndicator | null = null;
  private currentStyle: MapStyle | null = null;
  private currentFilters: MapFilters = defaultMapFilters;
  private terrainEnabled = false;
  private currentSlopeOverlay: MapStyleOverlay | null = null;
  private slopeRenderer: SlopeTerrainRenderer | null = null;
  private cameraPositionManager: CameraPositionManager;

  constructor(
    cameraPosition: CameraPosition,
    containerID: string | HTMLElement,
    eventBus: EventBus,
    cameraPositionManager: CameraPositionManager
  ) {
    this.cameraPositionManager = cameraPositionManager;
    this.eventBus = eventBus;
    this.map = new maplibregl.Map({
      container: containerID,
      center: cameraPosition.center,
      zoom: cameraPosition.zoom,
      bearing: cameraPosition.bearing,
      pitch: cameraPosition.pitch,
      hash: false, // Custom hash management
      attributionControl: false,
    });
    this.markers = [];
    this.filterControl = new FilterControl(eventBus);
    this.searchBarControl = new SearchBarControl(eventBus);

    this.interactionManager = new MapInteractionManager(this.map, eventBus);

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

    this.geolocateControl = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
    });
    this.map.addControl(this.geolocateControl, "bottom-right");

    this.headingIndicator = new HeadingIndicator({
      geolocateControl: this.geolocateControl,
    });
    this.headingIndicator.onAdd(this.map);

    this.map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: false,
      }),
      "bottom-right"
    );

    this.demSource = new mlcontour.DemSource({
      url: "https://tiles.openskimap.org/dynamic/data/merged-terrain/{z}/{x}/{y}.webp",
      encoding: "mapbox",
      maxzoom: 16,
      worker: true,
      cacheSize: 100,
      timeoutMs: 10000,
    });

    this.demSource.setupMaplibre(maplibregl);
    // Initialize slope terrain renderer early
    this.slopeRenderer = new SlopeTerrainRenderer(this.demSource);
    this.slopeRenderer?.registerSlopeProtocol();

    // Register satellite tile protocol to filter empty tiles
    registerSatelliteTileProtocol();

    // Check if map starts with tilt and enable terrain if so
    const initialPitch = this.map.getPitch();
    if (initialPitch > 0) {
      this.terrainEnabled = true;
    }

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

    // Enable/disable terrain based on pitch
    this.map.on("pitchend", () => {
      const pitch = this.map.getPitch();
      const shouldEnableTerrain = pitch > 0;

      if (shouldEnableTerrain !== this.terrainEnabled) {
        this.terrainEnabled = shouldEnableTerrain;

        // Update terrain directly without reloading style
        if (shouldEnableTerrain) {
          // Enable 3D terrain
          const terrainSource = this.map.getSource("terrain");
          if (terrainSource) {
            this.map.setTerrain({ source: "terrain" });
          }
        } else {
          // Disable 3D terrain
          this.map.setTerrain(null);
        }

        // Update building layer visibility directly
        if (this.map.getLayer("building-3d")) {
          this.map.setLayoutProperty(
            "building-3d",
            "visibility",
            shouldEnableTerrain ? "visible" : "none"
          );
        }
        if (this.map.getLayer("building-top")) {
          this.map.setLayoutProperty(
            "building-top",
            "visibility",
            shouldEnableTerrain ? "none" : "visible"
          );
        }
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

    // Update camera position on map movement
    this.map.on("moveend", () => {
      this.cameraPositionManager.savePosition(
        this.map.getCenter(),
        this.map.getZoom(),
        this.map.getBearing(),
        this.map.getPitch()
      );
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

        // Define layer visibility rules
        const getLayerVisibility = (
          layerId: string
        ): "visible" | "none" | null => {
          // Unit-based layers
          if (layerId.endsWith("-metric"))
            return unitSystem === "metric" ? "visible" : "none";
          if (layerId.endsWith("-imperial"))
            return unitSystem === "imperial" ? "visible" : "none";

          // Building layers based on terrain mode
          if (layerId === "building-3d")
            return this.terrainEnabled ? "visible" : "none";
          if (layerId === "building-top")
            return this.terrainEnabled ? "none" : "visible";

          // Hide hillshade layer when slope terrain overlay is enabled (except avalanche slope classes)
          if (layerId === "hillshade")
            return isSlopeOverlay(this.currentSlopeOverlay) && this.currentSlopeOverlay !== MapStyleOverlay.AvalancheSlopeClasses ? "none" : "visible";

          // No visibility change needed
          return null;
        };

        // Apply filter rules to layers
        const applyFilters = (layers: any[]) => {
          const filterRules = getFilterRules(this.currentFilters);

          return layers.map((layer) => {
            // Apply visibility rules first
            const visibility = getLayerVisibility(layer.id);
            let updatedLayer = layer;

            if (visibility !== null) {
              updatedLayer = {
                ...layer,
                layout: {
                  ...layer.layout,
                  visibility,
                },
              };
            }

            // Apply filter rules based on source-layer
            const sourceLayer = layer["source-layer"];
            let filterRule = null;
            let mergeExistingFilter = true;

            if (layer.id === "selected-run" || layer.id === "selected-lift") {
              filterRule = filterRules.selected;
              mergeExistingFilter = false; // Replace existing filter
            } else if (sourceLayer === "skiareas") {
              filterRule = filterRules.skiAreas;
            } else if (sourceLayer === "runs") {
              filterRule = filterRules.runs;
            } else if (sourceLayer === "lifts") {
              filterRule = filterRules.lifts;
            }

            // Apply filter rule
            if (filterRule === "hidden") {
              updatedLayer = {
                ...updatedLayer,
                layout: {
                  ...updatedLayer.layout,
                  visibility: "none",
                },
              };
            } else if (filterRule && filterRule !== true && Array.isArray(filterRule)) {
              // Combine with existing filter if present
              const existingFilter = layer.filter;
              const newFilter = existingFilter && mergeExistingFilter
                ? ["all", existingFilter, filterRule]
                : filterRule;

              updatedLayer = {
                ...updatedLayer,
                filter: newFilter,
              };
            }

            return updatedLayer;
          });
        };

        // Apply visibility and filter rules to layers
        const updatedLayers = applyFilters(newStyle.layers);

        // Handle 3D terrain for all styles
        let baseStyle = {
          ...newStyle,
          layers: updatedLayers,
          terrain: this.terrainEnabled ? newStyle.terrain : undefined,
        };

        // Modify terrain source if it exists to use the same demSource to avoid double loading
        if (
          baseStyle.sources.terrain &&
          baseStyle.sources.terrain.type === "raster-dem"
        ) {
          baseStyle.sources.terrain = {
            ...baseStyle.sources.terrain,
            tiles: [this.demSource.sharedDemProtocolUrl],
          };
        }

        // Modify satellite source to use custom protocol that filters empty tiles
        if (baseStyle.sources.satellite && baseStyle.sources.satellite.type === "raster") {
          baseStyle.sources.satellite = {
            ...baseStyle.sources.satellite,
            tiles: ["satellite-filtered://{z}/{y}/{x}"],
          };
        }

        if (style == MapStyle.Terrain) {
          // Apply contour layers to new style
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

          // Hillshade is defined as a separate source than the 3d terrain (see https://github.com/maplibre/maplibre-gl-js/issues/2035 for details)
          if (
            baseStyle.sources.hillshade &&
            baseStyle.sources.hillshade.type === "raster-dem"
          ) {
            baseStyle.sources.hillshade = {
              ...baseStyle.sources.hillshade,
              tiles: [this.demSource.sharedDemProtocolUrl],
            };
          }

          // Add contour layers to the terrain style
          baseStyle = {
            ...baseStyle,
            sources: {
              ...baseStyle.sources,
              contours: {
                type: "vector" as const,
                tiles: contourTiles,
                maxzoom: 16,
              },
            },
            layers: [
              ...baseStyle.layers,
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
                  "symbol-spacing": 200,
                  "symbol-placement": "line" as const,
                  "text-anchor": "center" as const,
                  "text-size": 10,
                  "text-field": this.getContourTextFieldExpression(unitSystem),
                  "text-font": ["Noto Sans Regular"],
                },
              },
            ],
          };
        }

        // Add slope terrain overlay if enabled
        if (isSlopeOverlay(this.currentSlopeOverlay) && this.slopeRenderer?.checkSupport()) {
          // Add slope terrain source with style parameter
          const sourceName = `slope-terrain-${this.currentSlopeOverlay}`;
          if (!baseStyle.sources[sourceName]) {
            // Include date in URL for SunExposure style to enable proper caching
            let tileUrl = `slope-terrain://${this.currentSlopeOverlay}`;
            if (this.currentSlopeOverlay === MapStyleOverlay.SunExposure && this.slopeRenderer?.sunExposureDate) {
              const date = this.slopeRenderer.sunExposureDate;
              const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              tileUrl += `/${dayOfYear}`;
            }
            tileUrl += `/${this.demSource.sharedDemProtocolUrl}`;
            
            baseStyle.sources[sourceName] = {
              type: "raster",
              tiles: [tileUrl],
              tileSize: 512,
              minzoom: 5,
              maxzoom: 16,
            };
          }

          // Add slope terrain layer after the park layer
          const baseIndex = baseStyle.layers.findIndex(
            (layer) => layer.id === "park" || layer.id === "satellite"
          );
          const insertIndex =
            baseIndex >= 0 ? baseIndex + 1 : baseStyle.layers.length;
          baseStyle.layers.splice(insertIndex, 0, {
            id: "slope-terrain-overlay",
            type: "raster",
            source: sourceName,
            paint: {
              "raster-opacity": 0.7,
            },
          });
        }

        // Add track layers
        this.tracks.forEach((track) => {
          const sourceId = `track-${track.id}`;
          const outlineLayerId = `track-line-outline-${track.id}`;
          const layerId = `track-line-${track.id}`;

          // Add track source
          baseStyle.sources[sourceId] = {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {
                name: track.name,
                color: track.color,
              },
              geometry: {
                type: "LineString",
                coordinates: track.coordinates,
              },
            },
          };

          // Add track layers before other-ski-area-icons
          const baseIndex = baseStyle.layers.findIndex(
            (layer) => layer.id === "other-ski-area-icons"
          );
          const insertIndex =
            baseIndex >= 0 ? baseIndex : baseStyle.layers.length;

          // Add white outline layer (wider, underneath)
          baseStyle.layers.splice(insertIndex, 0, {
            id: outlineLayerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": "#ffffff",
              "line-width": 6,
              "line-opacity": 0.9,
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
          });

          // Add colored line layer (on top)
          baseStyle.layers.splice(insertIndex + 1, 0, {
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": track.color,
              "line-width": 3,
              "line-opacity": 1,
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
          });
        });

        return baseStyle;
      },
    });
  };

  private setFiltersUnthrottled = (filters: MapFilters) => {
    this.currentFilters = filters;
    this.waitForMapLoaded(() => {
      this.filterControl.setFilters(filters);
      // Refresh the style to apply filters instead of using filterManager for layer updates
      if (this.currentStyle !== null) {
        this.setStyle(this.currentStyle);
      }
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
      getVisibleSkiAreasCount(this.map, this.currentFilters)
    );
  };

  private updateVisibleSkiAreasCount = throttle(
    1000,
    this.updateVisibleSkiAreasCountUnthrottled
  );

  setSlopeOverlay = (overlay: MapStyleOverlay | null) => {
    this.waitForMapLoaded(() => {
      if (overlay === this.currentSlopeOverlay) {
        return; // No change needed
      }

      // Check if WebGL 2 is supported when enabling slope overlay
      if (isSlopeOverlay(overlay) && !this.slopeRenderer?.checkSupport()) {
        console.error("Slope terrain rendering requires WebGL 2 support");
        return;
      }

      this.currentSlopeOverlay = overlay;

      // Refresh the style to add/remove the slope terrain layer
      if (this.currentStyle !== null) {
        this.setStyle(this.currentStyle);
      }
    });
  };

  getSlopeOverlayEnabled = (): boolean => {
    return isSlopeOverlay(this.currentSlopeOverlay);
  };

  getCurrentSlopeOverlay = (): MapStyleOverlay | null => {
    return this.currentSlopeOverlay;
  };

  setSunExposureDate = (date: Date) => {
    if (this.slopeRenderer) {
      this.slopeRenderer.sunExposureDate = date;
      // If sun exposure overlay is active, refresh the style
      if (this.currentSlopeOverlay === MapStyleOverlay.SunExposure && this.currentStyle !== null) {
        this.setStyle(this.currentStyle);
      }
    }
  };

  setTracks = (tracks: Track[]) => {
    this.tracks = tracks;
    this.waitForMapLoaded(() => {
      // Trigger style refresh to update track layers
      if (this.currentStyle !== null) {
        this.setStyle(this.currentStyle);
      }
    });
  };

  addControl = (control: maplibregl.IControl, position?: string) => {
    this.map.addControl(control, position as maplibregl.ControlPosition);
  };

  getMaplibreMap = (): maplibregl.Map => {
    return this.map;
  };

  setDrawingMode = (enabled: boolean): void => {
    this.interactionManager.setInteractionsEnabled(!enabled);
  };
}
