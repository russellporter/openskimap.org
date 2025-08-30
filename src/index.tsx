import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as ReactDOM from "react-dom/client";
import { AboutModal } from "./components/AboutModal";
import { editMap } from "./components/ExternalURLOpener";
import { LayersControl } from "./components/LayersControl";
import { LayersModal } from "./components/LayersModal";
import { LegalModal } from "./components/LegalModal";
import { Map } from "./components/Map";
import { SettingsModal } from "./components/SettingsModal";
import Sidebar from "./components/Sidebar";
import State, { getInitialState, StateChanges } from "./components/State";
import StateStore from "./components/StateStore";
import { Themed } from "./components/Themed";
import { setUnitSystem } from "./components/UnitSystemManager";
import { getURLState, updateURL } from "./components/URLHistory";
import { updatePageMetadata } from "./components/utils/PageMetadata";
import "./index.css";
import { MapStyleOverlay } from "./MapStyle";

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

  const store = new StateStore(getInitialState(), update);

  window.addEventListener("pagehide", onPageHide);
  window.addEventListener(
    "popstate",
    () => {
      store.urlUpdate(getURLState());
    },
    false
  );

  maplibregl.setRTLTextPlugin(
    "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
    false
  );

  let center: maplibregl.LngLatLike;
  let zoom: number;
  if (localStorage["slippy.lat"] != null) {
    center = [localStorage["slippy.lng"], localStorage["slippy.lat"]];
    zoom = Number(localStorage["slippy.zoom"]);
  } else {
    center = [-100, 40];
    zoom = 2;
  }

  const map = new Map(center, zoom, "map", store);

  // Add layers control to map
  const layersControl = new LayersControl(store);
  map.addControl(layersControl);

  store.editMapHandler = () => {
    editMap(map);
  };

  store.urlUpdate(getURLState());

  update(store._state, store._state);

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
      map.toggleSlopeTerrainOverlay(
        state.mapStyleOverlay === MapStyleOverlay.Slope
      );
      localStorage.setItem("mapStyleOverlay", state.mapStyleOverlay ? state.mapStyleOverlay : "null");
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
      changes.mapStyleOverlay !== undefined
    ) {
      layersRoot.render(
        <Themed>
          <LayersModal
            eventBus={store}
            open={state.layersOpen}
            currentMapStyle={state.mapStyle}
            currentMapStyleOverlay={state.mapStyleOverlay}
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
  }

  function onPageHide() {
    localStorage.setItem("slippy.lat", map.getCenter().lat.toString());
    localStorage.setItem("slippy.lng", map.getCenter().lng.toString());
    localStorage.setItem("slippy.zoom", map.getZoom().toString());
  }
}

window.addEventListener("load", initialize);
