import * as React from 'react';
import * as Popup from './PopupComponents';
import { PointPopover } from './PointPopover';
import { OperatingStatusIcon } from './OperatingStatusIcon';
import { SkiAreaData } from './MapData';

interface SkiAreaPopupProps {
  data: SkiAreaData,
};

export const SkiAreaPopup: React.SFC<SkiAreaPopupProps> = props => {
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
}
