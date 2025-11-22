import * as maplibregl from "maplibre-gl";
import EventBus from "./EventBus";

const DRAWING_SOURCE_ID = "drawing-track-source";
const DRAWING_LINE_LAYER_ID = "drawing-track-line";
const DRAWING_LINE_OUTLINE_LAYER_ID = "drawing-track-line-outline";

export class TrackDrawingManager {
  private map: maplibregl.Map;
  private eventBus: EventBus;
  private isDrawing = false;
  private coordinates: [number, number][] = [];
  private markers: maplibregl.Marker[] = [];
  private styleDataHandler: () => void;

  constructor(map: maplibregl.Map, eventBus: EventBus) {
    this.map = map;
    this.eventBus = eventBus;

    // Re-add drawing layers when map style changes
    this.styleDataHandler = () => {
      if (this.isDrawing) {
        this.addDrawingLayers();
        this.updateLine();
      }
    };
    this.map.on("styledata", this.styleDataHandler);
  }

  startDrawing(): void {
    if (this.isDrawing) return;

    this.isDrawing = true;
    this.coordinates = [];

    // Add drawing-mode class to map container for crosshair cursor
    this.map.getContainer().classList.add("drawing-mode");

    // Add source and layers for drawing visualization
    this.addDrawingLayers();

    // Bind event handlers
    this.map.on("click", this.handleClick);
    this.map.on("contextmenu", this.handleRightClick);
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    // Remove drawing-mode class from map container
    this.map.getContainer().classList.remove("drawing-mode");

    // Remove event handlers
    this.map.off("click", this.handleClick);
    this.map.off("contextmenu", this.handleRightClick);

    // Remove drawing layers
    this.removeDrawingLayers();
  }

  updateCoordinates(coordinates: [number, number][]): void {
    this.coordinates = coordinates;
    this.updateDrawingVisualization();
  }

  private handleClick = (e: maplibregl.MapMouseEvent): void => {
    const coordinate: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    // Add marker immediately for instant feedback
    this.addMarkerAt(coordinate);

    // Update coordinates and line
    this.coordinates.push(coordinate);
    this.updateLine();

    // Then update state (for UI controls and persistence)
    this.eventBus.addDrawingTrackPoint(coordinate);
  };

  private handleRightClick = (e: maplibregl.MapMouseEvent): void => {
    e.preventDefault();
    if (this.coordinates.length > 0) {
      // Remove marker immediately
      const marker = this.markers.pop();
      if (marker) marker.remove();

      // Update coordinates and line
      this.coordinates.pop();
      this.updateLine();

      // Then update state
      this.eventBus.removeLastDrawingTrackPoint();
    }
  };

  private addMarkerAt(coordinate: [number, number]): void {
    const el = document.createElement("div");
    el.style.width = "12px";
    el.style.height = "12px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "#4CAF50";
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coordinate)
      .addTo(this.map);

    this.markers.push(marker);
  }

  private addDrawingLayers(): void {
    // Add empty source for the line
    if (!this.map.getSource(DRAWING_SOURCE_ID)) {
      this.map.addSource(DRAWING_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });
    }

    // Add white outline layer (wider, underneath)
    if (!this.map.getLayer(DRAWING_LINE_OUTLINE_LAYER_ID)) {
      this.map.addLayer({
        id: DRAWING_LINE_OUTLINE_LAYER_ID,
        type: "line",
        source: DRAWING_SOURCE_ID,
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
    }

    // Add colored line layer (on top)
    if (!this.map.getLayer(DRAWING_LINE_LAYER_ID)) {
      this.map.addLayer({
        id: DRAWING_LINE_LAYER_ID,
        type: "line",
        source: DRAWING_SOURCE_ID,
        paint: {
          "line-color": "#4CAF50",
          "line-width": 3,
          "line-opacity": 1,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });
    }
  }

  private removeDrawingLayers(): void {
    // Remove all markers
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];

    // Remove line layers and source
    if (this.map.getLayer(DRAWING_LINE_LAYER_ID)) {
      this.map.removeLayer(DRAWING_LINE_LAYER_ID);
    }
    if (this.map.getLayer(DRAWING_LINE_OUTLINE_LAYER_ID)) {
      this.map.removeLayer(DRAWING_LINE_OUTLINE_LAYER_ID);
    }
    if (this.map.getSource(DRAWING_SOURCE_ID)) {
      this.map.removeSource(DRAWING_SOURCE_ID);
    }
  }

  private updateLine(): void {
    const source = this.map.getSource(DRAWING_SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: this.coordinates,
      },
    });
  }

  private updateDrawingVisualization(): void {
    // Clear existing markers
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];

    // Recreate markers from coordinates
    for (const coord of this.coordinates) {
      this.addMarkerAt(coord);
    }

    // Update line
    this.updateLine();
  }
}
