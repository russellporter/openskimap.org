import 'whatwg-fetch';
import { Feature, Geometry } from 'geojson';
import { SkiLiftData, SkiRunData } from './MapData';

export function loadRun(lid: string): Promise<Feature<Geometry, SkiRunData>> {
  return load(lid)
}

export function loadLift(lid: string): Promise<Feature<Geometry, SkiLiftData>> {
  return load(lid)
}

function load(entityLID: string): Promise<Feature<Geometry, any>> {
  return fetch('https://tiles.skimap.org/features/' + entityLID + '.geojson')
    .then(response => {
      return response.json();
    });
}
