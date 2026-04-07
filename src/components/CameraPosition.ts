import * as maplibregl from "maplibre-gl";
import { ViewportHint } from "openskidata-format";
import controlWidth from "./controlWidth";

export interface CameraPosition {
  center: maplibregl.LngLatLike;
  zoom: number;
  bearing: number;
  pitch: number;
}

/**
 * Computes the optimal camera position for a ski area from its pre-computed
 * {@link ViewportHint} and the current map state (viewport size, FOV, info card width).
 *
 * When `hint.bearing` is null (no elevation data available), falls back to a top-down
 * view (pitch 0, bearing 0) so the absence of orientation data doesn't produce a
 * misleading tilted view.
 */
export function computeCameraPositionFromHint(
  hint: ViewportHint,
  map: maplibregl.Map,
  isInfoCardShown: boolean,
): CameraPosition {
  const [centerLng, centerLat] = hint.center;

  // No bearing means no elevation data → top-down view, no perspective correction needed.
  if (hint.bearing === null) {
    const canvas = map.getCanvas();
    const viewportWidth = canvas.clientWidth;
    const viewportHeight = canvas.clientHeight;
    const infoCardWidth = isInfoCardShown ? controlWidth(map) : 0;
    const applyInfoCardOffset = infoCardWidth < viewportWidth * (2 / 3);
    const effectiveViewportWidth = applyInfoCardOffset
      ? viewportWidth - infoCardWidth
      : viewportWidth;

    const C = (2 * Math.PI * 6371000) / 512;
    const cosLat = Math.cos(centerLat * (Math.PI / 180));
    const zoomFromWidth = Math.log2(
      (effectiveViewportWidth * C * cosLat) / hint.rotatedWidthMeters,
    );
    const zoomFromHeight = Math.log2(
      (viewportHeight * C * cosLat) / hint.rotatedHeightMeters,
    );
    const zoom = Math.min(zoomFromWidth, zoomFromHeight);

    // Shift centre rightward (in world coords) by half the info card width so the
    // feature appears centred in the visible portion of the viewport.
    const metersPerDeg = 111320;
    const groundResolution = (C * cosLat) / Math.pow(2, zoom);
    const infoCardShiftMeters = applyInfoCardOffset
      ? (infoCardWidth / 2) * groundResolution
      : 0;
    // At bearing=0 the info card horizontal shift is purely a longitude offset.
    const shiftLng = -infoCardShiftMeters / (cosLat * metersPerDeg);

    return {
      center: [centerLng + shiftLng, centerLat],
      zoom,
      bearing: 0,
      pitch: 0,
    };
  }

  const canvas = map.getCanvas();
  const viewportWidth = canvas.clientWidth;
  const viewportHeight = canvas.clientHeight;

  // Ground resolution constant: at zoom Z, resolution = C * cos(lat) / 2^Z metres/pixel
  // (using 512 px tile size as MapLibre default).
  const C = (2 * Math.PI * 6371000) / 512;
  const cosLat = Math.cos(centerLat * (Math.PI / 180));
  const bearingRad = (hint.bearing * Math.PI) / 180;

  // Derive near/far ground coverage from MapLibre's vertical FOV and the 45° pitch.
  // At 45° pitch, perspective makes the near side (downhill, bottom of viewport) cover
  // less ground per pixel than the far side (uphill, top).
  // map.transform.fov is in degrees in MapLibre v5.
  const pitchRad = (45 * Math.PI) / 180;
  const fovDeg: number = (map as any).transform?.fov ?? 60;
  const halfFovRad = (fovDeg / 2) * (Math.PI / 180);
  const cot = (a: number) => Math.cos(a) / Math.sin(a);
  const nearGround = cot(pitchRad) - cot(pitchRad + halfFovRad);
  const farGround = cot(pitchRad - halfFovRad) - cot(pitchRad);

  // The info card occupies the left side of the viewport; frame the ski area in the
  // remainder, but only when the card leaves enough horizontal space (> 1/3 of viewport).
  const infoCardWidth = isInfoCardShown ? controlWidth(map) : 0;
  const applyInfoCardOffset = infoCardWidth < viewportWidth * (2 / 3);
  const effectiveViewportWidth = applyInfoCardOffset
    ? viewportWidth - infoCardWidth
    : viewportWidth;

  const zoomFromWidth = Math.log2(
    (effectiveViewportWidth * C * cosLat) / hint.rotatedWidthMeters,
  );
  const zoomFromHeight = Math.log2(
    (viewportHeight * C * cosLat) / hint.rotatedHeightMeters,
  );
  const zoom = Math.min(zoomFromWidth, zoomFromHeight);

  // Shift the look-at point along camera Y (bearing direction) so the ski area fills the
  // asymmetric perspective viewport: the camera centre must sit at nearFraction of the
  // bbox height from the downhill edge (hint.minCameraY).
  const nearFraction = nearGround / (nearGround + farGround);
  const pitchCenterShiftMeters =
    hint.minCameraY + nearFraction * hint.rotatedHeightMeters;

  // Shift the look-at point along camera X (screen right) by half the info card width so
  // the ski area appears centred in the visible portion of the viewport.
  // Camera X in world space points in the direction perpendicular to bearing: (cos b, -sin b)
  // in (east, north). Shifting LEFT = negative camera X = moving the look-at point toward
  // the centre of the effective viewport.
  const groundResolution = (C * cosLat) / Math.pow(2, zoom);
  const infoCardShiftMeters = applyInfoCardOffset
    ? (infoCardWidth / 2) * groundResolution
    : 0;

  const metersPerDeg = 111320;
  const shiftLng =
    (Math.sin(bearingRad) * pitchCenterShiftMeters -
      Math.cos(bearingRad) * infoCardShiftMeters) /
    (cosLat * metersPerDeg);
  const shiftLat =
    (Math.cos(bearingRad) * pitchCenterShiftMeters +
      Math.sin(bearingRad) * infoCardShiftMeters) /
    metersPerDeg;

  return {
    center: [centerLng + shiftLng, centerLat + shiftLat],
    zoom,
    bearing: hint.bearing,
    pitch: 45,
  };
}
