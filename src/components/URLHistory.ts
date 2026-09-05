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
  /**
   * Selected ski passes, comma separated, or null when the URL says nothing about them.
   */
  selectedSkiPasses: string | null;
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
  if (state.selectedSkiPasses) {
    query.push(encodeParameter("passes", state.selectedSkiPasses));
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
    selectedSkiPasses: query.get("passes"),
  };
}

function encodeParameter(name: string, value: string): string {
  return new URLSearchParams([[name, value]]).toString();
}
