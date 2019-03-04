import * as React from 'react';
import './PopupComponents';
import * as OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import * as Tooltip from 'react-bootstrap/lib/Tooltip';
import { Status } from './MapData';

interface Props {
  status: Status,
  entityName: string,
  hideIfOperating: Boolean,
};

export const StatusIcon: React.SFC<Props> = props => {
  if (props.hideIfOperating && props.status === Status.Operating) {
    return null;
  }

  const tooltip =
    <Tooltip>{tooltipText(props.status, props.entityName)}</Tooltip>;

  return (
    <OverlayTrigger
      placement='top'
      overlay={tooltip}
    >
      <span className={
        'status-icon status-icon-' + props.status
          + ' glyphicon '
          + icon(props.status)
      } />
    </OverlayTrigger>
  );
};

function icon(status: Status) {
  switch (status) {
    case Status.Proposed:
    case Status.Planned:
    case Status.Construction:
      return 'glyphicon-info-sign';
    case Status.Operating:
      return 'glyphicon-ok-sign'
    case Status.Abandoned:
    case Status.Disused:
      return 'glyphicon-remove-sign';
  }
}

function tooltipText(status: Status, entityName: string) {
  switch (status) {
    case Status.Proposed:
      return "This " + entityName + " is proposed to be built."
    case Status.Planned:
      return "This " + entityName + " is planned to be built."
    case Status.Construction:
      return "This " + entityName + " is under construction."
    case Status.Operating:
      return "This " + entityName + " is thought to be operational."
    case Status.Abandoned:
      return "This " + entityName + " is abandoned."
    case Status.Disused:
      return "This " + entityName + " is not being operated."
    case null:
      return "The status of this " + entityName + " is unknown."
  }
}
