import * as mapboxgl from "mapbox-gl";
import { Map } from "./components/Map";
import "./index.css";

let map;

function initialize() {
  mapboxgl.accessToken =
    "pk.eyJ1IjoicnVzc2VsbCIsImEiOiJjaXUwYWE5NGYwMW94MnpydG5jaWxjOHJsIn0.oyWAcfWU5SMOOWevkrenlw";
  mapboxgl.setRTLTextPlugin(
    "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.1.2/mapbox-gl-rtl-text.js"
  );

  if (localStorage["slippy.lat"] != null) {
    var center = [localStorage["slippy.lng"], localStorage["slippy.lat"]];
    var zoom = Number(localStorage["slippy.zoom"]);
  } else {
    var zoom = 2;
    var center = [-100, 40];
  }

  map = new Map(center, zoom, "map");
  $(".edit-map-button").click(editInPotlatch);
}

function editInPotlatch() {
  var center = map.getCenter().wrap();
  window.location.href =
    "https://www.openstreetmap.org/edit?editor=id#map=" +
    map.getZoom() +
    "/" +
    center.lat +
    "/" +
    center.lng;
}

function unload() {
  localStorage.setItem("slippy.lat", map.getCenter().lat);
  localStorage.setItem("slippy.lng", map.getCenter().lng);
  localStorage.setItem("slippy.zoom", map.getZoom());
}

$(window).load(function() {
  initialize();
});

$(window).unload(function() {
  unload();
});
