import { Map } from "./Map";

export function openSkimapOrg() {
  openURL("https://skimap.org");
}

export function editMap(map: Map) {
  let center = map!.getCenter().wrap();
  openURL(
    "https://www.openstreetmap.org/edit?editor=id#map=" +
      map!.getZoom() +
      "/" +
      center.lat +
      "/" +
      center.lng
  );
}

function openURL(url: string) {
  let a = document.createElement("a");
  a.href = url;
  a.setAttribute("target", "_blank");
  a.click();
}
