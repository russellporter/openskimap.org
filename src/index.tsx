import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as ReactDOM from "react-dom/client";
import { AboutModal } from "./components/AboutModal";
import { editMap } from "./components/ExternalURLOpener";
import { GpxDropZone } from "./components/GpxDropZone";
import { LayersControl } from "./components/LayersControl";
import { LayersModal } from "./components/LayersModal";
import { LegalModal } from "./components/LegalModal";
import { Map } from "./components/Map";
import { SettingsModal } from "./components/SettingsModal";
import Sidebar from "./components/Sidebar";
import State, { getInitialState, StateChanges } from "./components/State";
import StateStore from "./components/StateStore";
import { Themed } from "./components/Themed";
import { TrackDrawingControls } from "./components/TrackDrawingControls";
import { TrackDrawingManager } from "./components/TrackDrawingManager";
import { setUnitSystem } from "./components/UnitSystemManager";
import { getURLState, updateURL } from "./components/URLHistory";
import { updatePageMetadata } from "./components/utils/PageMetadata";
import { readGpxFile } from "./utils/TrackParser";
import { CameraPositionManager } from "./utils/CameraPositionManager";
import "./index.css";

function initialize() {
  const sidebarRoot = ReactDOM.createRoot(document.getElementById("sidebar")!);
  const aboutRoot = ReactDOM.createRoot(
    document.getElementById("about-modal")!
  );
  const legalRoot = ReactDOM.createRoot(
    document.getElementById("legal-modal")!
  );
  const settingsRoot = ReactDOM.createRoot(
    document.getElementById("settings-modal")!
  );
  const layersRoot = ReactDOM.createRoot(
    document.getElementById("layers-modal")!
  );
  const trackDrawingRoot = ReactDOM.createRoot(
    document.getElementById("track-drawing-controls")!
  );
  const gpxDropZoneRoot = ReactDOM.createRoot(
    document.getElementById("gpx-drop-zone")!
  );

  // Track drawing manager - declared early so it's available in update function closure
  let trackDrawingManager: TrackDrawingManager | null = null;
  // Map reference - will be set after map is created
  let mapInstance: Map | null = null;
  // Track drag state for GPX drop zone
  let isDraggingFile = false;
  let dragCounter = 0;

  const store = new StateStore(getInitialState(), update);

  window.addEventListener(
    "popstate",
    () => {
      store.urlUpdate(getURLState());
    },
    false
  );

  // GPX drag-and-drop handlers
  function hasGpxFile(event: DragEvent): boolean {
    if (!event.dataTransfer) return false;
    const items = event.dataTransfer.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const type = items[i].type;
        // GPX files may have various MIME types or none at all
        if (
          type === "application/gpx+xml" ||
          type === "application/xml" ||
          type === "text/xml" ||
          type === ""
        ) {
          return true;
        }
      }
    }
    return false;
  }

  function renderDropZone() {
    gpxDropZoneRoot.render(
      <Themed>
        <GpxDropZone visible={isDraggingFile} />
      </Themed>
    );
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    dragCounter++;
    if (hasGpxFile(event) && dragCounter === 1) {
      isDraggingFile = true;
      renderDropZone();
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      isDraggingFile = false;
      renderDropZone();
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragCounter = 0;
    isDraggingFile = false;
    renderDropZone();

    if (!event.dataTransfer) return;

    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith(".gpx")) {
        try {
          const tracks = await readGpxFile(file);
          for (const track of tracks) {
            store.addTrack(track);
          }
        } catch (error) {
          console.error("Failed to parse GPX file:", error);
          alert(
            `Failed to load GPX file "${file.name}": ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }
  }

  document.addEventListener("dragenter", handleDragEnter);
  document.addEventListener("dragleave", handleDragLeave);
  document.addEventListener("dragover", handleDragOver);
  document.addEventListener("drop", handleDrop);

  // Initial render of drop zone (hidden)
  renderDropZone();

  maplibregl.setRTLTextPlugin(
    "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
    false
  );

  const cameraPositionManager = new CameraPositionManager();
  const initialCamera = cameraPositionManager.getInitialPosition();
  console.log("Initial camera position:", initialCamera);
  const map = new Map(initialCamera, "map", store, cameraPositionManager);

  // Add layers control to map
  const layersControl = new LayersControl(store);
  map.addControl(layersControl);

  store.editMapHandler = () => {
    editMap(map);
  };

  store.urlUpdate(getURLState());

  update(store._state, store._state);
  
  // Initialize tracks on the map
  map.setTracks(store._state.tracks);

  // Store map reference for use in update function
  mapInstance = map;

  function update(state: State, changes: StateChanges) {
    updateURL({
      aboutInfoOpen: state.aboutInfoOpen,
      legalOpen: state.legalOpen,
      selectedObjectID: state.info?.id ?? null,
      markers: state.markers,
    });

    if (changes.mapStyle !== undefined) {
      map.setStyle(state.mapStyle);
      localStorage.setItem("mapStyle", state.mapStyle);
    }

    if (changes.mapStyleOverlay !== undefined) {
      map.setSlopeOverlay(state.mapStyleOverlay);
      localStorage.setItem("mapStyleOverlay", state.mapStyleOverlay ? state.mapStyleOverlay : "null");
    }

    if (changes.sunExposureDate !== undefined) {
      map.setSunExposureDate(state.sunExposureDate);
      localStorage.setItem("sunExposureDate", state.sunExposureDate.toISOString());
    }

    if (changes.sidebarOpen !== undefined || changes.mapStyle !== undefined) {
      sidebarRoot.render(
        <Themed>
          <Sidebar
            eventBus={store}
            open={state.sidebarOpen}
            selectedMapStyle={state.mapStyle}
          />
        </Themed>
      );
    }

    if (changes.aboutInfoOpen !== undefined) {
      aboutRoot.render(
        <Themed>
          <AboutModal eventBus={store} open={state.aboutInfoOpen} />
        </Themed>
      );
    }

    if (changes.legalOpen !== undefined) {
      legalRoot.render(
        <Themed>
          <LegalModal eventBus={store} open={state.legalOpen} />
        </Themed>
      );
    }

    if (
      changes.settingsOpen !== undefined ||
      changes.unitSystem !== undefined
    ) {
      settingsRoot.render(
        <Themed>
          <SettingsModal
            eventBus={store}
            open={state.settingsOpen}
            unitSystem={state.unitSystem}
          />
        </Themed>
      );
    }

    if (
      changes.layersOpen !== undefined ||
      changes.mapStyle !== undefined ||
      changes.mapStyleOverlay !== undefined ||
      changes.tracks !== undefined ||
      changes.sunExposureDate !== undefined
    ) {
      layersRoot.render(
        <Themed>
          <LayersModal
            eventBus={store}
            open={state.layersOpen}
            currentMapStyle={state.mapStyle}
            currentMapStyleOverlay={state.mapStyleOverlay}
            tracks={state.tracks}
            sunExposureDate={state.sunExposureDate}
          />
        </Themed>
      );
    }

    if (changes.mapFiltersOpen !== undefined) {
      map.setFiltersVisible(changes.mapFiltersOpen);
    }

    if (changes.info !== undefined) {
      if (changes.info === null) {
        updatePageMetadata(null);
      }
      map.setInfo(changes.info);
    }

    if (changes.mapFilters !== undefined) {
      map.setFilters(state.mapFilters);
    }

    if (changes.markers !== undefined) {
      map.setMarkers(changes.markers);
    }

    if (changes.latestMarker !== undefined) {
      const coordinates = changes.latestMarker.coordinates;
      map.flyTo([coordinates[0], coordinates[1]]);
    }

    if (changes.unitSystem !== undefined) {
      setUnitSystem(changes.unitSystem);
    }

    if (changes.tracks !== undefined) {
      localStorage.setItem("tracks", JSON.stringify(state.tracks));
      map.setTracks(state.tracks);
    }

    // Handle track drawing state
    if (changes.isDrawingTrack !== undefined && mapInstance) {
      // Disable normal map interactions while drawing
      mapInstance.setDrawingMode(state.isDrawingTrack);

      if (state.isDrawingTrack) {
        // Start drawing
        if (!trackDrawingManager) {
          trackDrawingManager = new TrackDrawingManager(mapInstance.getMaplibreMap(), store);
        }
        trackDrawingManager.startDrawing();
      } else {
        // Stop drawing
        if (trackDrawingManager) {
          trackDrawingManager.stopDrawing();
        }
      }
    }

    // Note: We don't update drawing visualization here on every coordinate change
    // because TrackDrawingManager already updates locally for responsiveness.
    // The state is kept in sync for the UI controls and persistence.

    // Update track drawing controls UI
    if (changes.isDrawingTrack !== undefined || changes.drawingTrackCoordinates !== undefined) {
      const trackLength = calculateDrawingTrackLength(state.drawingTrackCoordinates);
      trackDrawingRoot.render(
        <Themed>
          <TrackDrawingControls
            eventBus={store}
            isDrawing={state.isDrawingTrack}
            pointCount={state.drawingTrackCoordinates.length}
            trackLength={trackLength}
          />
        </Themed>
      );
    }
  }

  function calculateDrawingTrackLength(coordinates: [number, number][]): number {
    if (coordinates.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lon1, lat1] = coordinates[i - 1];
      const [lon2, lat2] = coordinates[i];
      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      totalDistance += R * c;
    }

    return totalDistance;
  }
}

window.addEventListener("load", initialize);
