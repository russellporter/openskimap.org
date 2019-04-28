import * as mapboxgl from "mapbox-gl";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Map } from "./components/Map";
import Sidebar from "./components/Sidebar";
import State from "./components/State";
import StateStore from "./components/StateStore";
import "./index.css";

let map: Map | null = null;

function initialize() {
  const store = new StateStore({ sidebarOpen: false }, update);

  (mapboxgl as any).accessToken =
    "pk.eyJ1IjoicnVzc2VsbCIsImEiOiJjaXUwYWE5NGYwMW94MnpydG5jaWxjOHJsIn0.oyWAcfWU5SMOOWevkrenlw";
  mapboxgl.setRTLTextPlugin(
    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.1.2/mapbox-gl-rtl-text.js",
    () => {}
  );

  let center: number[];
  let zoom: number;
  if (localStorage["slippy.lat"] != null) {
    center = [localStorage["slippy.lng"], localStorage["slippy.lat"]];
    zoom = Number(localStorage["slippy.zoom"]);
  } else {
    center = [-100, 40];
    zoom = 2;
  }

  map = new Map(center, zoom, "map", store);
  $(".edit-map-button").click(editInPotlatch);

  update(store._state);

  function update(state: State) {
    ReactDOM.render(
      <Sidebar eventBus={store} open={state.sidebarOpen} />,
      document.getElementById("sidebar")
    );
  }
}

function editInPotlatch() {
  var center = map!.getCenter().wrap();
  window.location.href =
    "https://www.openstreetmap.org/edit?editor=id#map=" +
    map!.getZoom() +
    "/" +
    center.lat +
    "/" +
    center.lng;
}

function unload() {
  localStorage.setItem("slippy.lat", map!.getCenter().lat.toString());
  localStorage.setItem("slippy.lng", map!.getCenter().lng.toString());
  localStorage.setItem("slippy.zoom", map!.getZoom().toString());
}

window.addEventListener("load", initialize);
window.addEventListener("unload", unload);
