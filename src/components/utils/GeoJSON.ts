export function getFirstPoint(geometry: GeoJSON.Geometry): GeoJSON.Position {
  switch (geometry.type) {
    case "Point":
      return geometry.coordinates;
    case "MultiPoint":
      return geometry.coordinates[0];
    case "LineString":
      return geometry.coordinates[0];
    case "MultiLineString":
      return geometry.coordinates[0][0];
    case "Polygon":
      return geometry.coordinates[0][0];
    case "MultiPolygon":
      return geometry.coordinates[0][0][0];
    case "GeometryCollection":
      return getFirstPoint(geometry.geometries[0]);
  }
}
