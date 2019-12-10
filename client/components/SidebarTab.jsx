import React from 'react';
import ReactDOM from 'react-dom';

// Sidebar implementation for latest version of leaflet-sidebar
const SidebarTab = ({children, id, active, header, onClose}) => {
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

export default SidebarTab;
