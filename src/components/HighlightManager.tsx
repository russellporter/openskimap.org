export interface ChartHighlighter {
  setChartHighlightPosition(position: mapboxgl.LngLatLike | null): void;
}

// Syncs highlighted position between a chart displayed and the map.
export default class HighlightManager {
  private map: mapboxgl.Map;
  private chartHighlighter: ChartHighlighter;
  private marker: mapboxgl.Marker | null = null;

  constructor(map: mapboxgl.Map, chartHighlighter: ChartHighlighter) {
    this.map = map;
    this.chartHighlighter = chartHighlighter;

    this.map.on("mousemove", "selected-run", this._onHover);
    this.map.on("mouseleave", "selected-run", this._onHoverOut);
  }

  private clearMarker() {
    const marker = this.marker;
    if (marker !== null) {
      marker.remove();
      this.marker = null;
    }
  }

  private showMarker(position: mapboxgl.LngLatLike) {
    let marker = this.marker;
    if (marker === null) {
      marker = new mapboxgl.Marker().setLngLat(position).addTo(this.map);
      this.marker = marker;
    }

    marker.setLngLat(position);
  }

  hoveredChartPosition = (position: mapboxgl.LngLatLike | null) => {
    if (position === null) {
      this.clearMarker();
    } else {
      this.showMarker(position);
    }
  };

  _onHover = (e: any) => {
    this.chartHighlighter.setChartHighlightPosition(e.lngLat);
  };

  _onHoverOut = (e: any) => {
    this.chartHighlighter.setChartHighlightPosition(null);
  };
}
