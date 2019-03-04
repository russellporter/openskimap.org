import * as ReactDOM from 'react-dom';
import { Popover } from './Popover';

export class PopoverManager {
  private map: mapboxgl.Map
  private popover: Popover | null = null

  onHoverChartPosition: (position: mapboxgl.LngLatLike | null) => void = () => {}

  constructor (map: mapboxgl.Map) {
    this.map = map
  }

  public show(popover: Popover) {
    this.clear()
    this.popover = popover
    this.popover.onHoverChartPosition = this.onHoverChartPosition
    this.popover.addTo(this.map)
  }

  public setChartHighlightPosition(position: mapboxgl.LngLatLike | null) {
    const popover = this.popover
    if (popover !== null) {
      popover.setChartHighlightPosition(position)
    }
  }

  public clear() {
    if (this.popover !== null) {
      this.popover.remove(this.map)
      this.popover = null
      this.map.setFilter('selected-run', ['==', 'lid', '-1'])
      this.map.setFilter('selected-lift', ['==', 'lid', '-1'])
    }
  }
}
