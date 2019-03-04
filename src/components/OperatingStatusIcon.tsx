import * as React from 'react';
import './PopupComponents';
import * as OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import * as Tooltip from 'react-bootstrap/lib/Tooltip';

interface OperatingStatusIconProps {
  operatingStatus: string,
};

export const OperatingStatusIcon: React.SFC<OperatingStatusIconProps> = props => {
  const tooltip =
    <Tooltip>{operatingStatusText(props.operatingStatus)}</Tooltip>;

  return (
    <OverlayTrigger
      placement='top'
      overlay={tooltip}
    >
      <span className={
        'operating-status-icon operating-status-icon-' + props.operatingStatus
          + ' glyphicon '
          + operatingStatusIcon(props.operatingStatus)
      } />
    </OverlayTrigger>
  );
};

function operatingStatusIcon(operatingStatus: string) {
  switch (operatingStatus) {
    case 'operating':
      return 'glyphicon-ok-sign';
    case 'closed':
      return 'glyphicon-remove-sign';
    case 'future':
    case 'unknown':
    default:
      return 'glyphicon-question-sign';
  }
}

function operatingStatusText(operatingStatus: string) {
  switch (operatingStatus) {
    case 'operating':
      return 'This ski area is thought to be operational.';
    case 'closed':
      return 'This ski area is thought to be abandoned.';
    case 'future':
      return 'This ski area is under planning/construction.'
    case 'unknown':
    default:
      return 'The status of this ski area is unknown.';
  }
}
