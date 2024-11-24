export type MapMarker = GeoJSON.Point;

export function stringifyMarkers(markers: MapMarker[]): string {
  return JSON.stringify(markers.map((marker) => marker.coordinates));
}

export function parseMarkers(json: string): MapMarker[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every(isCoordinates)) {
      return parsed.map((coordinates) => ({
        type: "Point",
        coordinates,
      }));
    }
  } catch (e) {
    console.error("Failed to parse markers:", e);
  }
  return [];
}

function isCoordinates(obj: any): obj is [number, number] {
  return (
    Array.isArray(obj) &&
    obj.length === 2 &&
    typeof obj[0] === "number" &&
    typeof obj[1] === "number"
  );
}
