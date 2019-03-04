import * as ReactDOM from 'react-dom';

export abstract class Popover {
  protected container = document.createElement('div');
  protected highlightPosition: mapboxgl.LngLatLike | null = null;

  public onHoverChartPosition: (position: mapboxgl.LngLatLike | null) => void = () => {}

  constructor() {}

  protected update(): void {
    ReactDOM.render(this.render(), this.container);
  }

  public setChartHighlightPosition(position: mapboxgl.LngLatLike | null) {
    this.highlightPosition = position;
    this.update();
  }

  _onHoverChartPosition = (position: mapboxgl.LngLatLike | null) => {
    this.onHoverChartPosition(position)
  }

  public abstract addTo(map: mapboxgl.Map): void;
  public abstract remove(map: mapboxgl.Map): void;
  protected abstract render(): React.ReactElement<any>;
}
