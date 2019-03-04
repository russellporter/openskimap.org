import turfLineChunk from '@turf/line-chunk';
import turfLength from '@turf/length';
import {lineString} from '@turf/helpers';
import { LineString } from 'geojson';

const heightProfileResolution = 0.1; // 0.1km

export type CoordinatesWithElevation = [Longitude, Latitude, Elevation][]

export interface ElevationData {
    ascent: Elevation
    descent: Elevation
    slopeInfo: SlopeInfo
    coordinatesWithElevation: CoordinatesWithElevation
    heightProfileResolution: number
}

interface AscentDescentInfo {
    ascent: Elevation
    descent: Elevation
    lastElevation: Elevation
}

interface SlopeInfo {
    average: Angle | null
    max: Angle | null
}

type Angle = number
type Latitude = number
type Longitude = number
type Elevation = number

export default function load(points: [Longitude, Latitude][]): Promise<ElevationData> {
    const body = JSON.stringify(elevationRequestData(points))
    return fetch(
        'https://elevation.racemap.com/api',
        {
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            method: 'POST',
            body: body
        }
    )
        .then(response => {
            return response.json()
        })
        .then(json => {
            const coordinatesWithElevation = elevationRequestResults(json, points)
            const {ascent, descent} = ascentDescent(coordinatesWithElevation)
            return {
                ascent: ascent,
                descent: descent,
                slopeInfo: slopeInfo(coordinatesWithElevation),
                coordinatesWithElevation: coordinatesWithElevation,
                heightProfileResolution: heightProfileResolution * 1000
            }
        });;
}

function ascentDescent(coordinatesWithElevation: CoordinatesWithElevation): AscentDescentInfo {
    if (coordinatesWithElevation.length === 0) {
        return {ascent: 0, descent: 0, lastElevation: 0}
    }
    return coordinatesWithElevation
        .map(coordinate => coordinate[2])
        .reduce((accumulated, currentElevation) => {
            const ascent = currentElevation - accumulated.lastElevation
            if (ascent > 0) {
                accumulated.ascent += ascent
            } else {
                accumulated.descent -= ascent
            }
            accumulated.lastElevation = currentElevation

            return accumulated
        }, {ascent: 0, descent: 0, lastElevation: coordinatesWithElevation[0][2]})
}

function slopeInfo(coordinatesWithElevation: CoordinatesWithElevation): SlopeInfo {
    if (coordinatesWithElevation.length < 2) {
        return {average: null, max: null}
    }
    
    let totalLength = 0
    let maxUphillSlope = Number.MIN_VALUE
    let maxDownhillSlope = Number.MAX_VALUE
    for(let i = 0; i < coordinatesWithElevation.length - 1; i++){
        const before = coordinatesWithElevation[i]
        const after = coordinatesWithElevation[i + 1]
        const elevation = after[2] - before[2]
        const length = turfLength(lineString([before, after]), {units: "meters"})
        
        const percentSlope = elevation / length
        maxUphillSlope = Math.max(maxUphillSlope, percentSlope)
        maxDownhillSlope = Math.min(maxDownhillSlope, percentSlope)

        totalLength += length
    }

    const maxSlope = Math.abs(maxUphillSlope) > Math.abs(maxDownhillSlope) ? maxUphillSlope : maxDownhillSlope
    const elevationChange = coordinatesWithElevation[coordinatesWithElevation.length - 1][2] - coordinatesWithElevation[0][2]
    const averageSlope = elevationChange / totalLength
    return {average: averageSlope, max: maxSlope}
}

function elevationRequestData(points: [Longitude, Latitude][]) {
    return points.map(point => [point[1], point[0]]);
}

function elevationRequestResults(results: any, points: [Longitude, Latitude][]): CoordinatesWithElevation {
    if (results) {
        return results.map((elevation: number, index: number) => [points[index][0], points[index][1], elevation]);
    }
    return []
}

export function extractEndpoints(line: LineString): [Longitude, Latitude][] {
  const coordinates = line.coordinates;
  if (coordinates.length === 0) {
    return []
  }
  const first = coordinates[0];
  if (coordinates.length === 1) {
    return [[first[0], first[1]]]
  }

  const last = coordinates[coordinates.length - 1];

  return [[first[0], first[1]], [last[0], last[1]]];
}

export function extractPoints(feature: any): [Latitude, Longitude][] {

    if (feature.type !== 'Feature') {
        return [];
    }

    const subfeatures = turfLineChunk(feature, heightProfileResolution).features;
    const points: [Latitude, Longitude][] = [];
    for (let subline of subfeatures) {
        const geometry = subline.geometry;
        if (geometry) {
            const point = geometry.coordinates[0]
            points.push([point[0], point[1]]);
        }
    }
    if (subfeatures.length > 0) {
        const geometry = subfeatures[subfeatures.length - 1].geometry;
        if (geometry) {
            const coords = geometry.coordinates;
            if (coords.length > 1) {
                const point = coords[coords.length - 1]
                points.push([point[0], point[1]]);
            }
        }
    }

    return points;
}
