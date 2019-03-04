/// <reference types="mapbox-gl" />
/// <reference types="geojson" />
declare namespace __MapboxGeocoder {
    interface LngLatLiteral {
        lat: number;
        lng: number;
    }

    type Bbox = [number, number, number, number];

    interface Options {
        accessToken?: string;
        /** On geocoded result what zoom level should the map animate to when a bbox isn't found in the response. If a bbox is found the map will fit to the bbox. (optional, default 16) */
        zoom?: number;
        /** Override the default placeholder attribute value. (optional, default "Search") */
        placeholder?: string;
        /** If false, animating the map to a selected result is disabled. (optional, default true) */
        flyTo?: boolean;
        /** a proximity argument: this is a geographical point given as an object with latitude and longitude properties. Search results closer to this point will be given higher priority. */
        proximity?: LngLatLiteral;
        /** a bounding box argument: this is a bounding box given as an array in the format [minX, minY, maxX, maxY]. Search results will be limited to the bounding box. */
        bbox?: Bbox;
        /** a comma seperated list of types that filter results to match those specified. See https://www.mapbox.com/developers/api/geocoding/#filter-type for available types. */
        types?: string;
        /** a comma separated list of country codes to limit results to specified country or countries. */
        country?: string;
        /** Minimum number of characters to enter before results are shown. (optional, default 2) */
        minLength?: number;
        /** Maximum number of results to show. (optional, default 5) */
        limit?: number;
        localGeocoder?: Function;
    }

    interface Results extends GeoJSON.FeatureCollection<GeoJSON.Point> {
        attribution: string;
        query: string[];
    }

    interface Result extends GeoJSON.Feature<GeoJSON.Point> {
        bbox: Bbox;
        center: number[];
        place_name: string;
        place_type: string[];
        relevance: number;
        text: string;
    }
}

declare class MapboxGeocoder extends mapboxgl.Control implements mapboxgl.IControl {
    constructor(options?: __MapboxGeocoder.Options);
    /**
     * Set & query the input
     * @param searchInput location name or other search input
     */
    query(searchInput: string): this;
    /**
     * Set input
     * @param searchInput location name or other search input
     */
    setInput(value: string): this;
    /**
     * Set proximity
     * @param proximity The new options.proximity value. This is a geographical point given as an object with latitude and longitude properties.
     */
    setProximity(proximity: __MapboxGeocoder.LngLatLiteral): this;
    /**
     * Get proximity
     * @returns The geocoder proximity
     */
    getProximity(): __MapboxGeocoder.LngLatLiteral;
    /**
     * Subscribe to events that happen within the plugin.
     * @param type name of event. Available events and the data passed into their respective event objects are:
     *
     * - __clear__ `Emitted when the input is cleared`
     * - __loading__ `{ query } Emitted when the geocoder is looking up a query`
     * - __results__ `{ results } Fired when the geocoder returns a response`
     * - __result__ `{ result } Fired when input is set`
     * - __error__ `{ error } Error as string
     * @param fn function that's called when the event is emitted.
     */
    on(type: "clear", listener: () => any): this;
    on(type: "loading", listener: (ev: { query: string; }) => any): this;
    on(type: "results", listener: (results: __MapboxGeocoder.Results) => any): this;
    on(type: "result", listener: (ev: { result: __MapboxGeocoder.Result}) => any): this;
    on(type: "error", listener: (e: { error: any }) => any): this;
    on(type: string, listener: Function): this;
    on(type: string, layer: string, listener: Function): this;
    /**
     * Remove an event
     * @param type Event name.
     * @param fn Function that should unsubscribe to the event emitted.
     */
    off(type: string, listener: Function): this;
    off(type: string, layer: string, listener: Function): this;

    getDefaultPosition(): string;
  	onRemove(map: mapboxgl.Map): void;
  	onAdd(map: mapboxgl.Map): HTMLElement;
}

// declare module 'MapboxGeocoder' {
//   export = MapboxGeocoder;
// }
