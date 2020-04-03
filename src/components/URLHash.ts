import * as queryString from "query-string";

export interface URLHashState {
  aboutInfoOpen: boolean;
}

export function updateURLHash(state: URLHashState) {
  const query = queryString.parse(location.hash);
  // Add about param to URL if it is opened.
  query["about"] = state.aboutInfoOpen ? null : undefined;
  location.hash = queryString.stringify(query);
}

export function getURLHash(): URLHashState {
  const query = queryString.parse(location.hash);
  return { aboutInfoOpen: query["about"] !== undefined ? true : false };
}
