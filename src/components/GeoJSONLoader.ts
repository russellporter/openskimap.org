import { API_BASE_URL } from "../Config";
import { ObjectIDType } from "./SelectedObject";

export function loadGeoJSON<T>(
  entityID: string,
  idType: ObjectIDType = "openskimap",
): Promise<T> {
  return fetch(`${API_BASE_URL}/features/${idType}/${entityID}.geojson`).then(
    (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load ${idType}/${entityID}: ${response.status} ${response.statusText}`,
        );
      }
      return response.json();
    },
  );
}
