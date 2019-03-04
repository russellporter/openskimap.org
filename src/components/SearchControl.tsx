import * as mapboxgl from "mapbox-gl";
import 'MapboxGeocoder';
import 'whatwg-fetch';
import * as lunr from 'lunr';

interface Options {
  accessToken: string;
  searchIndexURL: string;
}

export class SearchControl implements mapboxgl.IControl {
  private index: lunr.Index | undefined;
  private data: any;
  private geocoder: MapboxGeocoder;

  constructor(options: Options) {
	  this.geocoder = new MapboxGeocoder({accessToken: options.accessToken});

    fetch(options.searchIndexURL)
      .then(response => {
        return response.json();
      })
      .then(json => {
        this.index = lunr.Index.load(json.index);
        this.data = json.skiAreas;
      });
  }

  getDefaultPosition(): string {
		return this.geocoder.getDefaultPosition();
	}
	onRemove(map: mapboxgl.Map) {
		this.geocoder.onRemove(map);
	}
	onAdd(map: mapboxgl.Map): HTMLElement {
		return this.geocoder.onAdd(map);
	}

  _geocode = (query: string) => {
    const index = this.index;
    if (index) {
      const results = index.search(query);
      const geocoded = results.map(result => {
        return skiAreaFeature(this.data[result.ref]);
      });
      if (geocoded.length > 0) {
        return geocoded;
      }
    }
    return null;
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
