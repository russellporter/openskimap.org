import "whatwg-fetch";

export function loadGeoJSON<T>(entityID: string): Promise<T> {
  return fetch(
    "https://tiles.skimap.org/features/" + entityID + ".geojson"
  ).then(response => {
    return response.json();
  });
}
