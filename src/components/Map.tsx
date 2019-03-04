import * as mapboxgl from "mapbox-gl";
import { MapStyleControl } from './MapStyleControl';
import * as lunr from 'lunr';
import { MapInteractionManager } from './MapInteractionManager';

export class Map {
	private map: mapboxgl.Map;

  private index: lunr.Index | undefined;
  private data: any;

  private interactionManager: MapInteractionManager

  constructor (
    center: mapboxgl.LngLatLike,
    zoom: number,
    containerID: string | Element
  ) {
    this.map = new mapboxgl.Map({
      container: containerID, // container id
      style: 'https://tiles.skimap.org/styles/terrain.json',
      center: center, // starting position [lng, lat]
      zoom: zoom, // starting zoom,
      hash: true
    });

    this.interactionManager = new MapInteractionManager(this.map)

    this.map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    }));

    fetch('https://tiles.skimap.org/search_index.json')
      .then(response => {
        return response.json();
      })
      .then(json => {
        this.index = lunr.Index.load(json.index);
        this.data = json.skiAreas;
      });

    this.map.addControl(new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      zoom: 12,
      localGeocoder: (query: string) => {
        const index = this.index;
        if (index) {
          const results = index.search(query.trim() + '*');
          const geocoded = results.map(result => {
            return skiAreaFeature(this.data[result.ref]);
          });
          if (geocoded.length > 0) {
            return geocoded;
          }
        }
        return null;
      },
    }));

    this.map.addControl(new MapStyleControl());

    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
          enableHighAccuracy: true
      },
      trackUserLocation: true
    }));
  }

  getCenter = () => {
    return this.map.getCenter();
  }

  getZoom = () => {
    return this.map.getZoom();
  }
}

function skiAreaFeature(data: any) {
  return {
    center: data.coordinates,
    geometry: {
        type: "Point",
        coordinates: data.coordinates
    },
    place_name: data.name, // eslint-disable-line camelcase
    place_type: ['coordinate'], // eslint-disable-line camelcase
    properties: {},
    type: 'Feature'
  };
}
