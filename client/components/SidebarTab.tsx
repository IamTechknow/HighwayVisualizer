import React from 'react';
import { Icon, ArrowLeft } from 'react-feather';

// Sidebar implementation for latest version of leaflet-sidebar-v2

export interface Props {
  active?: boolean,
  children: React.ReactElement,
  header: string,
  icon?: React.ReactElement<Icon>,
  id: string,
  onClose?: (e: React.SyntheticEvent) => void,
}

const SidebarTab = ({
  children, id, active = false, header, onClose,
}: Props): React.ReactElement<Props> => {
  const activeClass = active ? 'active' : '';
  return (
    <div id={id} className={`leaflet-sidebar-pane ${activeClass}`}>
      <h1 className="leaflet-sidebar-header">
        {header}
        <div
          className="leaflet-sidebar-close leaflet-sidebar-close-offset"
          onClick={onClose}
          onKeyDown={onClose}
          role="button"
          tabIndex={-1}
        >
          <ArrowLeft />
        </div>
      </h1>
      {children}
    </div>
  );
};

export default SidebarTab;
