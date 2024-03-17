import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "../taginfo.json";
import "./assets/robots.txt";
import { AboutModal } from "./components/AboutModal";
import { editMap } from "./components/ExternalURLOpener";
import { Map } from "./components/Map";
import Sidebar from "./components/Sidebar";
import State, { getInitialState, StateChanges } from "./components/State";
import StateStore from "./components/StateStore";
import { Themed } from "./components/Themed";
import { getURLState, updateURL } from "./components/URLHistory";
import { updatePageMetadata } from "./components/utils/PageMetadata";
import * as Config from "./Config";
import "./index.css";

let map: Map | null = null;

function initialize() {
  registerServiceWorker();

  const store = new StateStore(getInitialState(), update);

  window.addEventListener(
    "popstate",
    () => {
      store.urlUpdate(getURLState());
    },
    false
  );

  (mapboxgl as any).accessToken =
    "pk.eyJ1IjoicnVzc2VsbCIsImEiOiJja215dmpmMWYwN3ZnMnRwazRuOHF1azZ4In0.JjYNDuMzMZ5plb_YbF_Q5A";
  mapboxgl.setRTLTextPlugin(
    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js",
    () => {}
  );

  let center: mapboxgl.LngLatLike;
  let zoom: number;
  if (localStorage["slippy.lat"] != null) {
    center = [localStorage["slippy.lng"], localStorage["slippy.lat"]];
    zoom = Number(localStorage["slippy.zoom"]);
  } else {
    center = [-100, 40];
    zoom = 2;
  }

  map = new Map(center, zoom, "map", store);

  store.editMapHandler = () => {
    editMap(map!);
  };

  store.urlUpdate(getURLState());

  update(store._state, store._state);

  function update(state: State, changes: StateChanges) {
    updateURL({
      aboutInfoOpen: state.aboutInfoOpen,
      selectedObjectID: state.info?.id ?? null,
    });

    if (changes.mapStyle !== undefined) {
      map!.setStyle(state.mapStyle);
    }

    if (
      changes.sidebarOpen !== undefined ||
      changes.mapStyle !== undefined ||
      changes.mapFilters !== undefined
    ) {
      ReactDOM.render(
        <Themed>
          <Sidebar
            eventBus={store}
            open={state.sidebarOpen}
            selectedMapStyle={state.mapStyle}
            mapFilters={state.mapFilters}
          />
        </Themed>,
        document.getElementById("sidebar")
      );
    }

    if (changes.aboutInfoOpen !== undefined) {
      ReactDOM.render(
        <Themed>
          <AboutModal eventBus={store} open={state.aboutInfoOpen} />
        </Themed>,
        document.getElementById("about-modal")
      );
    }

    if (changes.legendOpen !== undefined) {
      map!.setLegendVisible(changes.legendOpen);
    }

    if (changes.mapFiltersOpen !== undefined) {
      map!.setFiltersVisible(changes.mapFiltersOpen);
    }

    if (changes.info !== undefined) {
      if (changes.info === null) {
        updatePageMetadata(null);
      }
      map!.setInfo(changes.info);
    }

    if (changes.mapFilters !== undefined) {
      map!.setFilters(state.mapFilters);
    }
  }
}

function unload() {
  localStorage.setItem("slippy.lat", map!.getCenter().lat.toString());
  localStorage.setItem("slippy.lng", map!.getCenter().lng.toString());
  localStorage.setItem("slippy.zoom", map!.getZoom().toString());
}

window.addEventListener("load", initialize);
window.addEventListener("unload", unload);

async function registerServiceWorker(): Promise<void> {
  // Check that service workers are supported
  if ("serviceWorker" in navigator) {
    if (Config.ENABLE_SERVICE_WORKER) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("SW registered: ", registration);
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError);
        });
    } else {
      const registrations = await navigator.serviceWorker.getRegistrations();
      registrations.forEach(
        async (registration) => await registration.unregister()
      );
    }
  }
}
