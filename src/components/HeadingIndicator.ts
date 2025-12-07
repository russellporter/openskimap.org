import maplibregl from "maplibre-gl";

interface HeadingIndicatorOptions {
  geolocateControl: maplibregl.GeolocateControl;
}

export class HeadingIndicator {
  private map: maplibregl.Map | null = null;
  private geolocateControl: maplibregl.GeolocateControl;
  private currentPosition: GeolocationPosition | null = null;
  private currentHeading: number | null = null;
  private marker: maplibregl.Marker | null = null;
  private orientationHandler: ((event: DeviceOrientationEvent) => void) | null =
    null;

  constructor(options: HeadingIndicatorOptions) {
    this.geolocateControl = options.geolocateControl;
  }

  onAdd(map: maplibregl.Map): void {
    this.map = map;
    this.setupGeolocateListeners();
    this.requestOrientationPermission();
  }

  onRemove(): void {
    this.removeOrientationListener();
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    this.map = null;
  }

  private setupGeolocateListeners(): void {
    this.geolocateControl.on("geolocate", (position: GeolocationPosition) => {
      this.currentPosition = position;

      // Use heading from geolocation if available (typically when moving)
      if (position.coords.heading !== null && position.coords.heading !== undefined) {
        this.currentHeading = position.coords.heading;
      }

      this.updateMarker();
    });

    this.geolocateControl.on("trackuserlocationstart", () => {
      this.setupOrientationListener();
    });

    this.geolocateControl.on("trackuserlocationend", () => {
      this.removeOrientationListener();
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
    });
  }

  private async requestOrientationPermission(): Promise<void> {
    // Request permission on iOS
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        if (permission === "granted") {
          this.setupOrientationListener();
        }
      } catch (error) {
        console.warn("DeviceOrientation permission denied:", error);
      }
    } else {
      // For non-iOS devices, orientation is available without permission
      this.setupOrientationListener();
    }
  }

  private setupOrientationListener(): void {
    if (this.orientationHandler) {
      return; // Already listening
    }

    this.orientationHandler = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS Safari uses webkitCompassHeading (absolute compass heading)
      if ((event as any).webkitCompassHeading !== undefined) {
        heading = (event as any).webkitCompassHeading;
      }
      // Android Chrome/Edge: event.absolute is true when compass data is available
      else if (event.absolute && event.alpha !== null) {
        heading = event.alpha;
      }

      if (heading !== null) {
        this.currentHeading = heading;
        this.updateMarker();
      }
    };

    // Listen to deviceorientation - it works on both iOS and Android
    // On iOS: provides webkitCompassHeading
    // On Android with compass: provides absolute=true and alpha as compass heading
    window.addEventListener(
      "deviceorientation",
      this.orientationHandler as EventListener,
      true
    );
  }

  private removeOrientationListener(): void {
    if (this.orientationHandler) {
      window.removeEventListener(
        "deviceorientation",
        this.orientationHandler as EventListener,
        true
      );
      this.orientationHandler = null;
    }
  }

  private updateMarker(): void {
    if (!this.map || !this.currentPosition) {
      return;
    }

    const { latitude, longitude } = this.currentPosition.coords;
    const lngLat: [number, number] = [longitude, latitude];

    if (!this.marker) {
      // Create marker with heading indicator
      const el = this.createMarkerElement();
      this.marker = new maplibregl.Marker({
        element: el,
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat(lngLat)
        .addTo(this.map);
    } else {
      // Update existing marker position
      this.marker.setLngLat(lngLat);
    }

    // Update rotation
    if (this.currentHeading !== null) {
      this.marker.setRotation(this.currentHeading);
    }
  }

  private createMarkerElement(): HTMLElement {
    const el = document.createElement("div");
    el.className = "heading-indicator";
    el.innerHTML = `
      <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
        <!-- Direction indicator (pointing up/north when rotation is 0) -->
        <!-- Arrow/cone shape pointing upward -->
        <path d="M 25 8 L 30 22 L 25 20 L 20 22 Z" fill="#1976D2" opacity="0.9" stroke="white" stroke-width="1.5"/>
      </svg>
    `;
    return el;
  }
}
