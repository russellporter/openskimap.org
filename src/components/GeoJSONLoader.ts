import "whatwg-fetch";
import { API_BASE_URL } from "../Config";

export function loadGeoJSON<T>(entityID: string): Promise<T> {
  return fetch(
    API_BASE_URL + "/features/" + entityID + ".geojson"
  ).then((response) => {
    return response.json();
  });
}
