import React from 'react';
import ReactDOM from 'react-dom';
import { MapComponent } from 'react-leaflet';

// Sidebar implementation for latest version of leaflet-sidebar
export default class Sidebar extends MapComponent {
  onClose(e) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onClose && this.props.onClose();
  }

  onOpen(e, tabId) {
    e.preventDefault();
    e.stopPropagation();
    this.props.onOpen && this.props.onOpen(tabId);
  }

  renderTab(tab) {
    const {disabled, icon, id, selected} = tab.props;
    const activeText = id === selected ? ' active' : '';
    const disabledText = disabled ? ' disabled' : '';
    return (
      <li className={activeText + disabledText} key={id}>
        <a href={'#' + id} role="tab" onClick={e => disabled || this.onOpen(e, id)}>
          {icon}
        </a>
      </li>
    );
  }

  renderPanes(children) {
    const { closeIcon, selected, position } = this.props;
    return React.Children.map(children, p =>
      React.cloneElement(p, {
        onClose: this.onClose.bind(this),
        closeIcon,
        active: p.props.id === selected,
        position: position || 'left',
      })
    );
  }

  render() {
    const { children, collapsed, id, position } = this.props;
    const positionClass = `leaflet-sidebar-${position || 'left'}`;
    const collapsedClass = collapsed ? 'collapsed' : '';
    const tabs = React.Children.toArray(children);
    return (
      <div
        id={id}
        className={`leaflet-sidebar leaflet-touch ${positionClass} ${collapsedClass}`}>
        ref={el => {
          this.rootElement = el;
        }}
      >
        <div className='leaflet-sidebar-tabs'>
          <ul role='tablist'>
            {tabs.map(t => this.renderTab(t))}
          </ul>
        </div>
        <div className="leaflet-sidebar-content">
          {this.renderPanes(tabs)}
        </div>
      </div>
    );
  }
}
