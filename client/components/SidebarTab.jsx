import PropTypes from 'prop-types';
import React from 'react';
import { ArrowLeft } from 'react-feather';

// Tab content implementation for latest version of leaflet-sidebar-v2
const SidebarTab = ({
  children, id, active = false, header, onClose,
}) => {
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
          tabIndex="-1"
        >
          <ArrowLeft />
        </div>
      </h1>
      {children}
    </div>
  );
};

SidebarTab.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  header: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  onClose: PropTypes.func,
};

SidebarTab.defaultProps = {
  active: false,
  onClose: () => {},
};

export default SidebarTab;
