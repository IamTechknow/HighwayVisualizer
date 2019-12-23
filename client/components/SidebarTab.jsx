import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';

// Sidebar implementation for latest version of leaflet-sidebar
const SidebarTab = ({children, id, active = false, header, onClose}) => {
  const activeClass = active ? 'active' : '';
  const closeIcon = 'X';
  return (
    <div id={id} className={`leaflet-sidebar-pane ${activeClass}`}>
      <h1 className="leaflet-sidebar-header">
        {header}
        <div className="leaflet-sidebar-close" onClick={onClose}>
          {closeIcon}
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
};

export default SidebarTab;
