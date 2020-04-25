import * as queryString from "query-string";
import { shallowEqualObjects } from "shallow-equal";

export interface URLState {
  aboutInfoOpen: boolean;
  selectedObjectID: string | null;
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
    obj: state.selectedObjectID !== null ? state.selectedObjectID : undefined,
  });
  window.history.pushState(
    state,
    "OpenSkiMap.org",
    "/" + (query.length > 0 ? "?" : "") + query + location.hash
  );
}

export function getURLState(): URLState {
  const query = queryString.parseUrl(window.location.toString()).query;
  return {
    aboutInfoOpen: query.about !== undefined ? true : false,
    selectedObjectID:
      query.obj !== undefined && typeof query.obj === "string"
        ? query.obj
        : null,
  };
}
