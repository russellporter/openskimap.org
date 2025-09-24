import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";
import { throttle } from "throttle-debounce";
import MapFilters from "../MapFilters";
import { MapMarker } from "../MapMarker";
import { MAP_STYLE_URLS, MapStyle, MapStyleOverlay, isSlopeOverlay } from "../MapStyle";
import { Track } from "../utils/TrackParser";
import { EsriAttribution } from "./EsriAttribution";
import EventBus from "./EventBus";
import { FilterControl } from "./FilterControl";
import { InfoControl } from "./InfoControl";
import { InfoData } from "./InfoData";
import MapFilterManager from "./MapFilterManager";
import { MapInteractionManager } from "./MapInteractionManager";
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

  // @ts-ignore - interactionManager is stored for explicitness but doesn't need to be accessed
  private interactionManager: MapInteractionManager;
  private filterManager: MapFilterManager;
  private demSource: InstanceType<typeof mlcontour.DemSource>;
  private esriAttribution: EsriAttribution | null = null;
  private attributionControl: maplibregl.AttributionControl;
  private currentStyle: MapStyle | null = null;
  private terrainEnabled = false;
  private currentSlopeOverlay: MapStyleOverlay | null = null;
  private slopeRenderer: SlopeTerrainRenderer | null = null;

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

          // Hide hillshade layer when slope terrain overlay is enabled
          if (layerId === "hillshade")
            return isSlopeOverlay(this.currentSlopeOverlay) ? "none" : "visible";

          // No visibility change needed
          return null;
        };

        // Apply visibility rules to layers
        const updatedLayers = newStyle.layers.map((layer) => {
          const visibility = getLayerVisibility(layer.id);
          if (visibility === null) return layer;

          return {
            ...layer,
            layout: {
              ...layer.layout,
              visibility,
            },
          };
        });

        // Handle 3D terrain for all styles
        let baseStyle = {
          ...newStyle,
          layers: updatedLayers,
          terrain: this.terrainEnabled ? newStyle.terrain : undefined,
        };

        // Modify terrain source if it exists to use the same demSource to avoid double loading
        const updatedSources = { ...baseStyle.sources };
        if (
          updatedSources.terrain &&
          updatedSources.terrain.type === "raster-dem"
        ) {
          updatedSources.terrain = {
            ...updatedSources.terrain,
            tiles: [this.demSource.sharedDemProtocolUrl],
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
            updatedSources.hillshade &&
            updatedSources.hillshade.type === "raster-dem"
          ) {
            updatedSources.hillshade = {
              ...updatedSources.hillshade,
              tiles: [this.demSource.sharedDemProtocolUrl],
            };
          }

          // Add contour layers to the terrain style
          baseStyle = {
            ...baseStyle,
            sources: {
              ...updatedSources,
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

          // Add track layer before other-ski-area-icons
          const baseIndex = baseStyle.layers.findIndex(
            (layer) => layer.id === "other-ski-area-icons"
          );
          const insertIndex =
            baseIndex >= 0 ? baseIndex : baseStyle.layers.length;

          baseStyle.layers.splice(insertIndex, 0, {
            id: layerId,
            type: "line",
            source: sourceId,
            paint: {
              "line-color": track.color,
              "line-width": 3,
              "line-opacity": 0.8,
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
}
