import distance from "@turf/distance";
import { LineString } from "@turf/helpers";
import { segmentReduce } from "@turf/meta";

export default function getInclinedLengthInMeters(
  geometry: LineString
): number {
  return segmentReduce(
    geometry,
    (previous, segment) => {
      const coords = segment!.geometry.coordinates;
      const horizontalDistance = distance(coords[0], coords[1], {
        units: "meters"
      });
      const verticalDistance = (coords[1][2] || 0) - (coords[0][2] || 0);
      return (
        (previous || 0) +
        Math.sqrt(
          Math.pow(horizontalDistance, 2) + Math.pow(verticalDistance, 2)
        )
      );
    },
    0
  );
}
