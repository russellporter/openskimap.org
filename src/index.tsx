import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import AboutModal from "./components/AboutModal";
import * as ExternalURLOpener from "./components/ExternalURLOpener";
import { Map } from "./components/Map";
import Sidebar from "./components/Sidebar";
import State, { StateChanges } from "./components/State";
import StateStore from "./components/StateStore";
import "./index.css";
import { MapStyle } from "./MapStyle";

let map: Map | null = null;

function initialize() {
  const store = new StateStore(
    {
      editMapOpen: false,
      sidebarOpen: false,
      aboutInfoOpen: false,
      mapStyle: MapStyle.Terrain,
      info: null
    },
    update
  );

  (mapboxgl as any).accessToken =
    "pk.eyJ1IjoicnVzc2VsbCIsImEiOiJjaXUwYWE5NGYwMW94MnpydG5jaWxjOHJsIn0.oyWAcfWU5SMOOWevkrenlw";
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

  update(store._state, store._state);

  function update(state: State, changes: StateChanges) {
    if (changes.mapStyle !== undefined) {
      map!.setStyle(state.mapStyle);
    }

    if (changes.editMapOpen === true) {
      ExternalURLOpener.editMap(map!);
    }

    if (changes.sidebarOpen !== undefined || changes.mapStyle !== undefined) {
      ReactDOM.render(
        <Sidebar
          eventBus={store}
          open={state.sidebarOpen}
          selectedMapStyle={state.mapStyle}
        />,
        document.getElementById("sidebar")
      );
    }

    if (changes.aboutInfoOpen !== undefined) {
      ReactDOM.render(
        <AboutModal eventBus={store} open={state.aboutInfoOpen} />,
        document.getElementById("about-modal")
      );
    }

    if (changes.info !== undefined) {
      map!.setInfo(changes.info);
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
