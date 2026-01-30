declare const BUILD_TIMESTAMP: string;

export enum MapStyle {
  Satellite = "satellite",
  Terrain = "terrain",
}

export enum MapStyleOverlay {
  Slope = "slope",
  DownhillDifficulty = "downhillDifficulty",
  Aspect = "aspect",
  SunExposure = "sunExposure",
  AvalancheSlopeClasses = "avalancheSlopeClasses",
}

export const MAP_STYLE_URLS: Record<MapStyle, string> = {
  [MapStyle.Satellite]: `https://tiles.openskimap.org/styles/satellite_v2.json?v=${BUILD_TIMESTAMP}`,
  [MapStyle.Terrain]: `https://tiles.openskimap.org/styles/terrain_v2.json?v=${BUILD_TIMESTAMP}`,
};

export const SLOPE_OVERLAY_NAMES: Record<MapStyleOverlay, string> = {
  [MapStyleOverlay.Slope]: "Classic",
  [MapStyleOverlay.DownhillDifficulty]: "Downhill Difficulty",
  [MapStyleOverlay.Aspect]: "Aspect",
  [MapStyleOverlay.SunExposure]: "Sun Exposure",
  [MapStyleOverlay.AvalancheSlopeClasses]: "Avalanche Slope Classes",
};

export function isSlopeOverlay(overlay: MapStyleOverlay | null): boolean {
  return overlay !== null && Object.values(MapStyleOverlay).includes(overlay);
}
