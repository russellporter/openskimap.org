import turfDistance from "@turf/distance";
import * as maplibregl from "maplibre-gl";

export interface SkiAreaCameraPosition {
  center: maplibregl.LngLatLike;
  zoom: number;
  bearing: number;
  pitch: number;
}

export function computeSkiAreaCameraPosition(
  map: maplibregl.Map,
  skiAreaId: string
): SkiAreaCameraPosition | null {
  const style = map.getStyle();

  const runsSourceId = (
    style.layers.find((l) => (l as any)["source-layer"] === "runs") as any
  )?.source as string | undefined;
  const liftsSourceId = (
    style.layers.find((l) => (l as any)["source-layer"] === "lifts") as any
  )?.source as string | undefined;

  const skiAreaFilter: maplibregl.ExpressionFilterSpecification = [
    "in",
    skiAreaId,
    ["get", "skiAreas"],
  ];

  const seenIds = new Set<string>();
  const features: maplibregl.GeoJSONFeature[] = [];

  if (runsSourceId) {
    const runFeatures = map.querySourceFeatures(runsSourceId, {
      sourceLayer: "runs",
      filter: skiAreaFilter,
    });
    for (const f of runFeatures) {
      const id = f.properties?.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        features.push(f);
      }
    }
  }

  if (liftsSourceId) {
    const liftFeatures = map.querySourceFeatures(liftsSourceId, {
      sourceLayer: "lifts",
      filter: skiAreaFilter,
    });
    for (const f of liftFeatures) {
      const id = f.properties?.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        features.push(f);
      }
    }
  }

  if (features.length === 0) {
    return null;
  }

  // Collect all coordinates and compute bbox
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  const allCoords: [number, number][] = [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (geometry.type === "LineString") {
      for (const coord of geometry.coordinates) {
        allCoords.push([coord[0], coord[1]]);
      }
    } else if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        for (const coord of line) {
          allCoords.push([coord[0], coord[1]]);
        }
      }
    }
  }

  for (const [lng, lat] of allCoords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  // Compute dominant downhill bearing weighted by segment length
  let sumSin = 0;
  let sumCos = 0;

  for (const feature of features) {
    const geometry = feature.geometry;
    const lines: [number, number][][] = [];

    if (geometry.type === "LineString") {
      lines.push(geometry.coordinates.map((c) => [c[0], c[1]]));
    } else if (geometry.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        lines.push(line.map((c) => [c[0], c[1]]));
      }
    }

    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lng0, lat0] = line[i];
        const [lng1, lat1] = line[i + 1];

        const elev0 = map.queryTerrainElevation([lng0, lat0]) ?? 0;
        const elev1 = map.queryTerrainElevation([lng1, lat1]) ?? 0;

        if (elev0 === elev1) continue;

        // Determine downhill direction: from higher to lower elevation
        const [fromLng, fromLat, toLng, toLat] =
          elev0 > elev1
            ? [lng0, lat0, lng1, lat1]
            : [lng1, lat1, lng0, lat0];

        const bearing = greatCircleBearing(fromLat, fromLng, toLat, toLng);
        const length = turfDistance([lng0, lat0], [lng1, lat1], {
          units: "meters",
        });

        const bearingRad = (bearing * Math.PI) / 180;
        sumSin += Math.sin(bearingRad) * length;
        sumCos += Math.cos(bearingRad) * length;
      }
    }
  }

  let mapBearing = 0;
  if (sumSin !== 0 || sumCos !== 0) {
    const dominantDownhillBearing =
      (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
    const normalizedDownhill = ((dominantDownhillBearing % 360) + 360) % 360;
    // View from below the mountain looking up: opposite of downhill direction
    mapBearing = (normalizedDownhill + 180) % 360;
  }

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Project all coordinates onto the camera's rotated axes (screen X = right, screen Y = up)
  // so that the computed width/height reflect what actually needs to fit in the viewport,
  // not the larger axis-aligned bbox.
  const metersPerDeg = 111320;
  const cosLat = Math.cos(centerLat * (Math.PI / 180));
  const bearingRad = (mapBearing * Math.PI) / 180;

  let minCameraX = Infinity, maxCameraX = -Infinity;
  let minCameraY = Infinity, maxCameraY = -Infinity;
  for (const [lng, lat] of allCoords) {
    const dx = (lng - centerLng) * cosLat * metersPerDeg;
    const dy = (lat - centerLat) * metersPerDeg;
    // Rotate into camera space: camera X is perpendicular to bearing, Y is along bearing
    const cx = dx * Math.cos(-bearingRad) - dy * Math.sin(-bearingRad);
    const cy = dx * Math.sin(-bearingRad) + dy * Math.cos(-bearingRad);
    if (cx < minCameraX) minCameraX = cx;
    if (cx > maxCameraX) maxCameraX = cx;
    if (cy < minCameraY) minCameraY = cy;
    if (cy > maxCameraY) maxCameraY = cy;
  }
  const rotatedWidthMeters = maxCameraX - minCameraX;
  const rotatedHeightMeters = maxCameraY - minCameraY;

  // At zoom Z with 512px tiles, ground resolution = C * cos(lat) / 2^Z meters/pixel
  // where C = 2π * R_earth / 512
  const C = (2 * Math.PI * 6371000) / 512;

  // Use actual viewport dimensions, taking the most constraining axis.
  // Subtract 0.5 stop to account for 45° pitch perspective foreshortening.
  const canvas = map.getCanvas();
  const viewportWidth = canvas.clientWidth;
  const viewportHeight = canvas.clientHeight;
  const zoomFromWidth = Math.log2((viewportWidth * C * cosLat) / rotatedWidthMeters);
  const zoomFromHeight = Math.log2((viewportHeight * C * cosLat) / rotatedHeightMeters);
  const zoom = Math.min(zoomFromWidth, zoomFromHeight);

  return {
    center: [centerLng, centerLat],
    zoom,
    bearing: mapBearing,
    pitch: 45,
  };
}

function greatCircleBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
