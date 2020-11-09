import PropTypes from 'prop-types';
import React from 'react';
import { MapComponent } from 'react-leaflet';

// Sidebar implementation for latest version of leaflet-sidebar-v2
export default class Sidebar extends MapComponent {
  onClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onClose();
  }

  onToggle(e, tabId) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onToggle(tabId);
  }

  // Use tab props defined in route drawer to render the tab itself
  renderTab(tab) {
    const { selected } = this.props;
    const { icon, id } = tab.props;
    const activeText = id === selected ? ' active' : '';
    return (
      <li className={activeText} key={id}>
        <a href={`#${id}`} role="tab" onClick={(e) => this.onToggle(e, id)}>
          {icon}
        </a>
      </li>
    );
  }

  // Clone each tab to add more props, which will be used to render the tab content
  renderTabContent(children) {
    const { selected, position } = this.props;
    return React.Children.map(children, (e) => React.cloneElement(e, {
      onClose: this.onClose.bind(this),
      active: e.props.id === selected,
      position: position || 'left',
    }));
  }

  render() {
    const {
      children, collapsed = false, id, position = 'left',
    } = this.props;
    const positionClass = `leaflet-sidebar-${position}`;
    const collapsedClass = collapsed ? 'collapsed' : '';
    const tabs = React.Children.toArray(children);
    return (
      <div
        id={id}
        className={`leaflet-sidebar leaflet-touch ${positionClass} ${collapsedClass}`}
      >
        <div className="leaflet-sidebar-tabs">
          <ul role="tablist">
            {tabs.map((t) => this.renderTab(t))}
          </ul>
        </div>
        <div className="leaflet-sidebar-content">
          {this.renderTabContent(tabs)}
        </div>
      </div>
    );
  }
}

Sidebar.propTypes = {
  children: PropTypes.node.isRequired,
  collapsed: PropTypes.bool,
  id: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  position: PropTypes.string,
  selected: PropTypes.string.isRequired,
};

Sidebar.defaultProps = {
  collapsed: false,
  position: 'left',
};
