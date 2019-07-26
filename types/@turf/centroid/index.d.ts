import { AllGeoJSON, Feature, Point, Properties } from "@turf/helpers";

export default function centroid<P = Properties>(
  geojson: AllGeoJSON,
  options?: {
    properties?: P;
  }
): Feature<Point, P>;
