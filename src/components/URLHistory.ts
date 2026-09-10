import queryString from "query-string";
import { shallowEqualObjects } from "shallow-equal";
import { MapMarker, parseMarkers, stringifyMarkers } from "../MapMarker";
import { ObjectIDType } from "./SelectedObject";

const validIDTypes: ObjectIDType[] = ["openskimap", "skimap_org", "openstreetmap"];

export interface URLState {
  aboutInfoOpen: boolean;
  legalOpen: boolean;
  legendOpen: boolean;
  markers: MapMarker[];
  selectedObjectID: string | null;
  selectedObjectIDType: ObjectIDType;
  showInfo: boolean;
}

export function updateURL(state: URLState) {
  if (shallowEqualObjects(state, getURLState())) {
    return;
  }

  if (!window.history) {
    return;
  }

  const query = queryString.stringify({
    about: state.aboutInfoOpen ? null : undefined,
    legal: state.legalOpen ? null : undefined,
    legend: state.legendOpen ? null : undefined,
    obj: state.selectedObjectID !== null ? state.selectedObjectID : undefined,
    obj_type:
      state.selectedObjectID !== null && state.selectedObjectIDType !== "openskimap"
        ? state.selectedObjectIDType
        : undefined,
    show_info:
      state.selectedObjectID && !state.showInfo ? "false" : undefined,
    markers:
      state.markers.length > 0 ? stringifyMarkers(state.markers) : undefined,
  });
  window.history.replaceState(
    state,
    "OpenSkiMap.org",
    "/" + (query.length > 0 ? "?" : "") + query + location.hash
  );
}

export function getURLState(): URLState {
  const query = queryString.parseUrl(window.location.toString()).query;
  const rawType = query.obj_type;
  const selectedObjectIDType: ObjectIDType =
    typeof rawType === "string" && (validIDTypes as string[]).includes(rawType)
      ? (rawType as ObjectIDType)
      : "openskimap";
  return {
    aboutInfoOpen: query.about !== undefined ? true : false,
    legalOpen: query.legal !== undefined ? true : false,
    legendOpen: query.legend !== undefined ? true : false,
    selectedObjectID:
      query.obj !== undefined && typeof query.obj === "string"
        ? query.obj
        : null,
    selectedObjectIDType,
    showInfo: query.show_info !== "false",
    markers:
      query.markers !== undefined && typeof query.markers === "string"
        ? parseMarkers(query.markers)
        : [],
  };
}
