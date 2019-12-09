import { Coord, Units } from "@turf/helpers";

export default function distance(
  from: Coord,
  to: Coord,
  options?: {
    units?: Units;
  }
): number;
