import { Popover } from "./Popover";

export abstract class PointPopover extends Popover {
  private popup: mapboxgl.Popup;

  constructor(
    position: mapboxgl.LngLatLike,
    options: mapboxgl.PopupOptions = {offset: 6}
  ) {
    super();

	  this.popup = (new mapboxgl.Popup(options))
      .setLngLat(position)
      .setDOMContent(this.container);
  }

  public addTo(map: mapboxgl.Map): void {
    this.popup.addTo(map)
    this.update()
  }

  public remove(map: mapboxgl.Map): void {
    this.popup.remove()
  }
}
