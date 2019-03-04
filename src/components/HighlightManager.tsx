import { PopoverManager } from "./PopoverManager";

// Syncs highlighted position between a chart displayed and the map.
export class HighlightManager {
  private map: mapboxgl.Map;
  private popoverManager: PopoverManager;
  private marker: mapboxgl.Marker | null = null;

  constructor(map: mapboxgl.Map, popoverManager: PopoverManager) {
    this.map = map;
    this.popoverManager = popoverManager;

    popoverManager.onHoverChartPosition = this._hoveredChartPosition;

    this.map.on('mousemove', 'selected-run', this._onHover);
    this.map.on('mouseleave', 'selected-run', this._onHoverOut);
  }

  private clearMarker() {
    const marker = this.marker
    if (marker !== null) {
      marker.remove()
      this.marker = null
    }
  }

  private showMarker(position: mapboxgl.LngLatLike) {
    let marker = this.marker
    if (marker === null) {
      marker = new mapboxgl.Marker()
        .setLngLat(position)
        .addTo(this.map)
      this.marker = marker
    }

    marker.setLngLat(position)
  }

  _hoveredChartPosition = (position: mapboxgl.LngLatLike | null) => {
    if (position === null) {
      this.clearMarker()
    } else {
      this.showMarker(position)
    }
  }

  _onHover = (e: any) => {
    this.popoverManager.setChartHighlightPosition(e.lngLat);
  }

  _onHoverOut = (e: any) => {
    this.popoverManager.setChartHighlightPosition(null);
  }
}
