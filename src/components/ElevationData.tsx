import { lineString } from "@turf/helpers";
import turfLength from "@turf/length";
import turfLineChunk from "@turf/line-chunk";
import { LineString } from "geojson";
import { ElevationProfile } from "openskidata-format";

export type CoordinatesWithElevation = [Longitude, Latitude, Elevation][];

export interface ElevationData {
  ascent: Elevation;
  descent: Elevation;
  minElevation: Elevation;
  maxElevation: Elevation;
  slopeInfo: SlopeInfo;
  coordinatesWithElevation: CoordinatesWithElevation;
  heightProfileResolution: number;
}

interface AscentDescentInfo {
  ascent: Elevation;
  descent: Elevation;
  lastElevation: Elevation;
  minElevation: Elevation;
  maxElevation: Elevation;
}

interface SlopeInfo {
  average: Angle | null;
  max: Angle | null;
}

type Angle = number;
type Latitude = number;
type Longitude = number;
type Elevation = number;

export default function getElevationData(
  geometry: LineString,
  elevationProfile: ElevationProfile
): ElevationData {
  const coordinatesWithElevation = addCoordinatesToElevationProfile(
    geometry,
    elevationProfile
  );
  const { ascent, descent, minElevation, maxElevation } = getAscentAndDescent(
    coordinatesWithElevation
  );
  return {
    ascent,
    descent,
    minElevation,
    maxElevation,
    coordinatesWithElevation,
    slopeInfo: slopeInfo(coordinatesWithElevation),
    heightProfileResolution: elevationProfile.resolution,
  };
}

export function getAscentAndDescent(
  coordinatesWithElevation: CoordinatesWithElevation
): AscentDescentInfo {
  if (coordinatesWithElevation.length === 0) {
    throw "Empty coordinates are not supported for elevation data analysis";
  }
  const initialElevation = coordinatesWithElevation[0][2];
  return coordinatesWithElevation
    .map((coordinate) => coordinate[2])
    .reduce(
      (accumulated, currentElevation) => {
        const ascent = currentElevation - accumulated.lastElevation;
        if (ascent > 0) {
          accumulated.ascent += ascent;
        } else {
          accumulated.descent -= ascent;
        }
        accumulated.lastElevation = currentElevation;
        accumulated.minElevation = Math.min(
          currentElevation,
          accumulated.minElevation
        );
        accumulated.maxElevation = Math.max(
          currentElevation,
          accumulated.maxElevation
        );

        return accumulated;
      },
      {
        ascent: 0,
        descent: 0,
        minElevation: initialElevation,
        maxElevation: initialElevation,
        lastElevation: initialElevation,
      } as AscentDescentInfo
    );
}

function slopeInfo(
  coordinatesWithElevation: CoordinatesWithElevation
): SlopeInfo {
  if (coordinatesWithElevation.length < 2) {
    return { average: null, max: null };
  }

  let totalLength = 0;
  let maxUphillSlope = Number.MIN_VALUE;
  let maxDownhillSlope = Number.MAX_VALUE;
  for (let i = 0; i < coordinatesWithElevation.length - 1; i++) {
    const before = coordinatesWithElevation[i];
    const after = coordinatesWithElevation[i + 1];
    const elevation = after[2] - before[2];
    const length = turfLength(lineString([before, after]), { units: "meters" });

    const percentSlope = elevation / length;
    maxUphillSlope = Math.max(maxUphillSlope, percentSlope);
    maxDownhillSlope = Math.min(maxDownhillSlope, percentSlope);

    totalLength += length;
  }

  const maxSlope =
    Math.abs(maxUphillSlope) > Math.abs(maxDownhillSlope)
      ? maxUphillSlope
      : maxDownhillSlope;
  const elevationChange =
    coordinatesWithElevation[coordinatesWithElevation.length - 1][2] -
    coordinatesWithElevation[0][2];
  const averageSlope = elevationChange / totalLength;
  return { average: averageSlope, max: maxSlope };
}

function addCoordinatesToElevationProfile(
  geometry: LineString,
  elevationProfile: ElevationProfile
): CoordinatesWithElevation {
  const points = extractPoints(geometry, elevationProfile.resolution);
  const heights = elevationProfile.heights;
  if (points.length !== heights.length) {
    throw "Mismatch of points & elevation profile. Did the backend elevation profile generation code change?";
  }

  return points.map((point, index) => {
    return [point[0], point[1], heights[index]];
  });
}

function extractPoints(
  geometry: LineString,
  resolution: number
): [Latitude, Longitude][] {
  const subfeatures = turfLineChunk(geometry, resolution, { units: "meters" })
    .features;
  const points: [Latitude, Longitude][] = [];
  for (let subline of subfeatures) {
    const geometry = subline.geometry;
    if (geometry) {
      const point = geometry.coordinates[0];
      points.push([point[0], point[1]]);
    }
  }
  if (subfeatures.length > 0) {
    const geometry = subfeatures[subfeatures.length - 1].geometry;
    if (geometry) {
      const coords = geometry.coordinates;
      if (coords.length > 1) {
        const point = coords[coords.length - 1];
        points.push([point[0], point[1]]);
      }
    }
  }

  return points;
}
