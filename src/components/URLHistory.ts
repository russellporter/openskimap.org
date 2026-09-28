import { MapMarker, parseMarkers, stringifyMarkers } from "../MapMarker";
import { ObjectIDType } from "./SelectedObject";

const validIDTypes: ObjectIDType[] = [
  "openskimap",
  "skimap_org",
  "openstreetmap",
];

export interface URLState {
  aboutInfoOpen: boolean;
  legalOpen: boolean;
  legendOpen: boolean;
  markers: MapMarker[];
  selectedObjectID: string | null;
  selectedObjectIDType: ObjectIDType;
  showInfo: boolean;
  fallbackCamera?: CameraTarget | null;
}

export interface CameraTarget {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
}

export function updateURL(state: URLState) {
  if (!window.history) {
    return;
  }

  const query: string[] = [];
  if (state.aboutInfoOpen) query.push("about");
  if (state.legalOpen) query.push("legal");
  if (state.legendOpen) query.push("legend");
  if (state.selectedObjectID !== null) {
    query.push(encodeParameter("obj", state.selectedObjectID));
    if (state.selectedObjectIDType !== "openskimap") {
      query.push(encodeParameter("obj_type", state.selectedObjectIDType));
    }
    if (!state.showInfo) query.push("show_info=false");
  }
  if (state.markers.length > 0) {
    query.push(encodeParameter("markers", stringifyMarkers(state.markers)));
  }

  const nextURL = `/${query.length > 0 ? `?${query.join("&")}` : ""}${location.hash}`;
  const currentURL = `${location.pathname}${location.search}${location.hash}`;
  if (currentURL !== nextURL) {
    window.history.replaceState(state, "OpenSkiMap.org", nextURL);
  }
}

export function getURLState(): URLState {
  const query = new URL(window.location.href).searchParams;
  const rawType = query.get("obj_type");
  const selectedObjectIDType: ObjectIDType =
    typeof rawType === "string" && (validIDTypes as string[]).includes(rawType)
      ? (rawType as ObjectIDType)
      : "openskimap";
  return {
    aboutInfoOpen: query.has("about"),
    legalOpen: query.has("legal"),
    legendOpen: query.has("legend"),
    selectedObjectID: query.get("obj"),
    selectedObjectIDType,
    showInfo: query.get("show_info") !== "false",
    markers: query.has("markers") ? parseMarkers(query.get("markers")!) : [],
    fallbackCamera: parseFallbackCamera(query.get("fallback_camera")),
  };
}

/**
 * Parses a fallback camera in the same format as the map location hash:
 * `zoom/latitude/longitude[/bearing[/pitch]]`, e.g. `17.9/37.635/-119.006/-119.8/0`.
 * A leading `#` is tolerated. Returns null when the value is missing or invalid.
 */
function parseFallbackCamera(value: string | null): CameraTarget | null {
  if (value === null) {
    return null;
  }

  const parts = value.trim().replace(/^#/, "").split("/");
  if (parts.length < 3) {
    return null;
  }

  const zoom = Number(parts[0]);
  const latitude = Number(parts[1]);
  const longitude = Number(parts[2]);
  if (
    !Number.isFinite(zoom) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const bearing = parseOptionalNumber(parts[3]);
  const pitch = parseOptionalNumber(parts[4]);
  return {
    latitude,
    longitude,
    zoom: Math.min(24, Math.max(0, zoom)),
    ...(bearing !== undefined ? { bearing } : {}),
    ...(pitch !== undefined ? { pitch } : {}),
  };
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function encodeParameter(name: string, value: string): string {
  return new URLSearchParams([[name, value]]).toString();
}
