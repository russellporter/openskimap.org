import * as maplibregl from "maplibre-gl";

export interface CameraPosition {
  center: maplibregl.LngLatLike;
  zoom: number;
  bearing: number;
  pitch: number;
}

export class CameraPositionManager {
  private readonly defaultPosition: CameraPosition = {
    center: [-100, 40],
    zoom: 2,
    bearing: 0,
    pitch: 0,
  };

  /**
   * Detects if the app is running as an installed PWA
   */
  isPWAMode(): boolean {
    return window.matchMedia("(display-mode: standalone)").matches;
  }

  /**
   * Gets the initial camera position based on PWA mode and available sources
   * Priority:
   * - PWA mode (first install): hash > default
   * - PWA mode (subsequent): localStorage > default
   * - Browser mode: hash > localStorage > default
   */
  getInitialPosition(): CameraPosition {
    const fromLocalStorage = this.getCameraFromLocalStorage();
    const fromHash = this.parseLocationHash();

    if (this.isPWAMode()) {
      // First install: no localStorage yet, use hash if available
      if (fromLocalStorage === null && fromHash !== null) {
        return fromHash;
      }
      // Subsequent launches: use localStorage or default (ignore hash)
      return fromLocalStorage || this.defaultPosition;
    } else {
      // Browser mode: hash takes priority for shared links
      return fromHash || fromLocalStorage || this.defaultPosition;
    }
  }

  /**
   * Saves camera position to appropriate storage based on mode
   * - PWA mode: saves to localStorage only
   * - Browser mode: saves to both localStorage and URL hash
   */
  savePosition(
    center: maplibregl.LngLat,
    zoom: number,
    bearing: number,
    pitch: number
  ): void {
    // Always save to localStorage
    this.saveCameraToLocalStorage(center, zoom, bearing, pitch);

    // Update URL hash only in browser mode
    if (!this.isPWAMode()) {
      this.updateLocationHash(center, zoom, bearing, pitch);
    }
  }

  private getCameraFromLocalStorage(): CameraPosition | null {
    const lat = localStorage.getItem("slippy.lat");
    const lng = localStorage.getItem("slippy.lng");
    const zoom = localStorage.getItem("slippy.zoom");
    const bearing = localStorage.getItem("slippy.bearing");
    const pitch = localStorage.getItem("slippy.pitch");

    // Check all required fields exist
    if (lat === null || lng === null || zoom === null) {
      return null;
    }

    return {
      center: [Number(lng), Number(lat)],
      zoom: Number(zoom),
      bearing: bearing !== null ? Number(bearing) : 0,
      pitch: pitch !== null ? Number(pitch) : 0,
    };
  }

  private parseLocationHash(): CameraPosition | null {
    const hash = window.location.hash;
    if (!hash || hash === "#") {
      return null;
    }

    const parts = hash.slice(1).split("/");
    if (parts.length < 3) {
      return null;
    }

    const zoom = parseFloat(parts[0]);
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);
    const bearing = parts[3] ? parseFloat(parts[3]) : 0;
    const pitch = parts[4] ? parseFloat(parts[4]) : 0;

    if (isNaN(zoom) || isNaN(lat) || isNaN(lng)) {
      return null;
    }

    return {
      center: [lng, lat],
      zoom,
      bearing,
      pitch,
    };
  }

  private generateLocationHash(
    center: maplibregl.LngLat,
    zoom: number,
    bearing: number,
    pitch: number
  ): string {
    const precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2) + 2);

    const lat = center.lat.toFixed(precision);
    const lng = center.lng.toFixed(precision);
    const zoomStr = Math.round(zoom * 100) / 100;

    // Only include bearing and pitch if they're non-zero
    let hash = `#${zoomStr}/${lat}/${lng}`;

    if (bearing !== 0 || pitch !== 0) {
      const bearingStr = Math.round(bearing * 10) / 10;
      const pitchStr = Math.round(pitch);
      hash += `/${bearingStr}/${pitchStr}`;
    }

    return hash;
  }

  private saveCameraToLocalStorage(
    center: maplibregl.LngLat,
    zoom: number,
    bearing: number,
    pitch: number
  ): void {
    localStorage.setItem("slippy.lat", center.lat.toString());
    localStorage.setItem("slippy.lng", center.lng.toString());
    localStorage.setItem("slippy.zoom", zoom.toString());
    localStorage.setItem("slippy.bearing", bearing.toString());
    localStorage.setItem("slippy.pitch", pitch.toString());
  }

  private updateLocationHash(
    center: maplibregl.LngLat,
    zoom: number,
    bearing: number,
    pitch: number
  ): void {
    const newHash = this.generateLocationHash(center, zoom, bearing, pitch);

    // Only update if hash actually changed
    if (window.location.hash !== newHash) {
      const currentUrl =
        window.location.pathname + window.location.search + newHash;
      window.history.replaceState(window.history.state, "", currentUrl);
    }
  }
}
