import { PopoverManager } from './PopoverManager';
import { SkiRunData, SkiLiftData, SkiAreaData } from './MapData';
import { SkiRunPopover } from './SkiRunPopup';
import { SkiLiftPopover } from './SkiLiftPopup';
import { SkiAreaPopover } from './SkiAreaPopup';
import { HighlightManager } from './HighlightManager';

export class MapInteractionManager {
    private popoverManager: PopoverManager
    private highlightManager: HighlightManager
    private map: mapboxgl.Map

    constructor(map: mapboxgl.Map) {
        this.map = map
        this.popoverManager = new PopoverManager(map)
        this.highlightManager = new HighlightManager(map, this.popoverManager)

        map.on('load', () => {
            this.attachListeners()
        })
    }

    private attachListeners() {
        const skiAreaLayers = [
          'operating-downhill-nordic-ski-area-icons-1',
          'operating-downhill-nordic-ski-area-icons-2',
          'operating-downhill-ski-area-icons',
          'operating-nordic-ski-area-icons',
          'other-operating-ski-area-icons',
          'other-ski-area-icons',
          'ski-area-labels'];

        const style = this.map.getStyle();

        const tappableLayers = (style.layers || [])
            .filter((layer: any) => layer.id.indexOf('tappable') !== -1)
            .map((layer: any) => layer.id)
            // Prioritization of clicks: ski area, ski lift, ski run (linear),
            // ski run (area). Need to reverse the order so lowest priority layers
            // are registered first (and overridden by later event handlers)
            .reverse() as [string];

        const hoverableLayers = skiAreaLayers.concat(tappableLayers);

        tappableLayers.forEach(layer => {
            if (layer.indexOf('lift') !== -1) {
                this.map.on('click', layer, this._onClickSkiLift);
            } else {
                this.map.on('click', layer, this._onClickSkiRun);
            }
        });

        hoverableLayers.forEach(layer => {
            this.map.on('mouseenter', layer, () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            this.map.on('mouseleave', layer, () => {
                this.map.getCanvas().style.cursor = '';
            });
        });

        skiAreaLayers.forEach(layer => {
            this.map.on('click', layer, this._onClickSkiArea);
        });

        this.map.on('zoomstart', () => { this.popoverManager.clear() });
    }

    _onClickSkiRun = (e: any) => {
        const data = e.features[0].properties as SkiRunData;
        this.popoverManager.show(new SkiRunPopover(e.lngLat, data))
    }

    _onClickSkiLift = (e: any) => {
        const data = e.features[0].properties as SkiLiftData;
        this.popoverManager.show(new SkiLiftPopover(e.lngLat, data))
    }

    _onClickSkiArea = (e: any) => {
        const data = e.features[0].properties as SkiAreaData
        this.popoverManager.show(new SkiAreaPopover(e.lngLat, data))
    }
}

function firstLatLng(nestedArray: any): number[] {
    while (nestedArray instanceof Array && nestedArray[0] instanceof Array) {
        nestedArray = nestedArray[0];
    }

    return nestedArray;
}
