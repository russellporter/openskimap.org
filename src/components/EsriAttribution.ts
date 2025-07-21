import * as maplibregl from "maplibre-gl";

interface AttributionBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface AttributionData {
  attribution: string;
  score: number;
  bounds: AttributionBounds;
  minZoom: number;
  maxZoom: number;
}

export class EsriAttribution {
  private map: maplibregl.Map;
  private attributionUrl: string;
  private attributions: AttributionData[] = [];
  private isActive = false;
  private attributionControl: maplibregl.AttributionControl | null = null;

  constructor(
    map: maplibregl.Map,
    attributionUrl: string,
    attributionControl: maplibregl.AttributionControl
  ) {
    this.map = map;
    this.attributionUrl = attributionUrl;
    this.attributionControl = attributionControl;
  }

  async fetchAttributionData(): Promise<void> {
    try {
      const response = await fetch(this.attributionUrl);
      const data = await response.json();

      this.attributions = [];
      data.contributors.forEach((contributor: any) => {
        contributor.coverageAreas.forEach((area: any) => {
          this.attributions.push({
            attribution: contributor.attribution,
            score: area.score,
            bounds: {
              south: area.bbox[0],
              west: area.bbox[1],
              north: area.bbox[2],
              east: area.bbox[3],
            },
            minZoom: area.zoomMin,
            maxZoom: area.zoomMax,
          });
        });
      });

      this.attributions.sort((a, b) => b.score - a.score);

      if (this.isActive) {
        this.updateAttribution();
      }
    } catch (error) {
      console.warn("Failed to fetch Esri attribution data:", error);
    }
  }

  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.map.on("moveend", this.updateAttribution.bind(this));
    this.map.on("zoomend", this.updateAttribution.bind(this));
    this.updateAttribution();

    if (this.attributions.length === 0) {
      this.fetchAttributionData();
    }
  }

  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.map.off("moveend", this.updateAttribution.bind(this));
    this.map.off("zoomend", this.updateAttribution.bind(this));
  }

  autoManage(): void {
    // Check if satellite source exists and activate/deactivate accordingly
    const checkSatelliteSource = () => {
      const hasSatelliteSource = this.map.getSource("satellite") !== undefined;

      if (hasSatelliteSource && !this.isActive) {
        this.activate();
      } else if (!hasSatelliteSource && this.isActive) {
        this.deactivate();
      }
    };

    // Check immediately
    checkSatelliteSource();

    // Check after style changes
    this.map.on("styledata", checkSatelliteSource);
  }

  private updateAttribution(): void {
    if (!this.attributions.length || !this.isActive || !this.attributionControl)
      return;

    const satelliteSource = this.map.getSource("satellite");
    if (!satelliteSource) return;

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();
    const zoomLowerBound = Math.floor(zoom) - 1;
    const zoomUpperBound = Math.ceil(zoom) + 1;
    const newAttributions = new Set<string>();

    for (const attr of this.attributions) {
      if (
        ((zoomLowerBound >= attr.minZoom && zoomLowerBound <= attr.maxZoom) ||
          (zoomUpperBound >= attr.minZoom && zoomUpperBound <= attr.maxZoom)) &&
        this.boundsIntersect(bounds, attr.bounds)
      ) {
        newAttributions.add(attr.attribution);
      }
    }

    // Update attribution control with dynamic attribution
    let fullAttribution = "";
    if (newAttributions.size > 0) {
      fullAttribution = Array.from(newAttributions).join(", ");
    }

    satelliteSource.attribution = "Powered by Esri, " + fullAttribution;

    (this.attributionControl as any)._updateAttributions();
  }
  private boundsIntersect(
    mapBounds: maplibregl.LngLatBounds,
    attrBounds: AttributionBounds
  ): boolean {
    const mapSW = mapBounds.getSouthWest();
    const mapNE = mapBounds.getNorthEast();

    let mapWest = mapSW.lng;
    let mapEast = mapNE.lng;

    // Normalize to -180 to 180 range
    if (mapWest > 180) mapWest -= 360;
    if (mapEast > 180) mapEast -= 360;
    if (mapWest < -180) mapWest += 360;
    if (mapEast < -180) mapEast += 360;

    const latIntersect =
      mapSW.lat <= attrBounds.north && mapNE.lat >= attrBounds.south;

    let lngIntersect: boolean;
    if (mapWest <= mapEast) {
      lngIntersect = mapWest <= attrBounds.east && mapEast >= attrBounds.west;
    } else {
      lngIntersect = mapWest <= attrBounds.east || mapEast >= attrBounds.west;
    }

    return latIntersect && lngIntersect;
  }
}
