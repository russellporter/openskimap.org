declare const BUILD_TIMESTAMP: string;

export enum MapStyle {
  Satellite = "satellite",
  Terrain = "terrain",
}

export const MAP_STYLE_URLS: Record<MapStyle, string> = {
  [MapStyle.Satellite]: `https://tiles.openskimap.org/styles/satellite_v2.json?v=${BUILD_TIMESTAMP}`,
  [MapStyle.Terrain]: `https://tiles.openskimap.org/styles/terrain_v2.json?v=${BUILD_TIMESTAMP}`,
};
