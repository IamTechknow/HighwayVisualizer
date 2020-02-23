import PropTypes from 'prop-types';
import React from 'react';
import { MapComponent } from 'react-leaflet';

// Sidebar implementation for latest version of leaflet-sidebar
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

  renderTab(tab) {
    const {
      disabled, icon, id, selected,
    } = tab.props;
    const activeText = id === selected ? ' active' : '';
    const disabledText = disabled ? ' disabled' : '';
    return (
      <li className={activeText + disabledText} key={id}>
        <a href={`#${id}`} role="tab" onClick={(e) => disabled || this.onToggle(e, id)}>
          {icon}
        </a>
      </li>
    );
  }

  renderPanes(children) {
    const { closeIcon, selected, position } = this.props;
    return React.Children.map(children, (p) => React.cloneElement(p, {
      onClose: this.onClose.bind(this),
      closeIcon,
      active: p.props.id === selected,
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
          {this.renderPanes(tabs)}
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
};

Sidebar.defaultProps = {
  collapsed: false,
  position: 'left',
};
