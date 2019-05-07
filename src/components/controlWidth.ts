export default function controlWidth(map: mapboxgl.Map) {
  const margins = 20;
  const width = map.getCanvasContainer().offsetWidth - margins;
  const maxWidth = 400;
  return width > maxWidth ? maxWidth : width;
}
