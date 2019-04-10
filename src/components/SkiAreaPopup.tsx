import * as React from 'react';
import * as Popup from './PopupComponents';
import { PointPopover } from './PointPopover';
import { OperatingStatusIcon } from './OperatingStatusIcon';
import { SkiAreaData } from './MapData';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

interface SkiAreaPopupProps {
  data: SkiAreaData,
};

const CrowdsourcedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  return (
    <Popup.Container>
      <Popup.Header>
        <Popup.Title title={props.data.name} />
        {' '}
        <OperatingStatusIcon operatingStatus={props.data.operating_status} />
      </Popup.Header>
      <div>
        <a target="_blank" href={'https://skimap.org/SkiAreas/view/' + props.data.id}>
          See maps at Skimap.org
        </a>
      </div>
    </Popup.Container>
  );
}

const GeneratedSkiArea: React.SFC<SkiAreaPopupProps> = props => {
  const tooltip =
  <Tooltip>This ski area information is generated from OpenStreetMap data</Tooltip>;

  return (
    <Popup.Container>
      <Popup.Header>
        <Popup.Title title={generatedSkiAreaTitle(props.data)} />
        {' '}
        <OverlayTrigger
          placement='top'
          overlay={tooltip}
        >
          <span className="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
        </OverlayTrigger>
      </Popup.Header>
    </Popup.Container>
  );
}

export const SkiAreaPopup: React.SFC<SkiAreaPopupProps> = props => {
  return props.data.generated ? <GeneratedSkiArea {...props} /> : <CrowdsourcedSkiArea {...props} />
};

export class SkiAreaPopover extends PointPopover {
  private data: SkiAreaData;

  constructor(position: mapboxgl.LngLatLike, data: SkiAreaData) {
    super(position);
    this.data = data
  }

	protected render(): React.ReactElement<any> {
		return <SkiAreaPopup data={this.data} />;
  }
  
  public addTo(map: mapboxgl.Map) {
    super.addTo(map);

    const filter = ['has', 'skiArea-' + this.data.id];
    map.setFilter('selected-lift', filter);
    map.setFilter('selected-run', filter);
  }

  public remove(map: mapboxgl.Map) {
    super.remove(map)

    const filter = ['==', 'lid', -1]
    map.setFilter('selected-lift', filter);
    map.setFilter('selected-run', filter);
  }
}

function generatedSkiAreaTitle(data: SkiAreaData) {
  if (data.has_downhill && data.has_nordic) {
    return "Downhill & Nordic Ski Area"
  } else if (data.has_downhill) {
    return "Downhill Ski Area"
  } else if (data.has_nordic) {
    return "Nordic Ski Area"
  } else {
    return "Ski Area"
  }
}
