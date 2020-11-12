import React from 'react';
import { DivOverlayTypes, MapComponent, MapComponentProps } from 'react-leaflet';
import type { Props as SidebarTabProps } from './SidebarTab';

interface Props extends MapComponentProps {
  children: React.ReactElement<SidebarTabProps> | React.ReactElement<SidebarTabProps>[],
  collapsed: boolean,
  id: string,
  onClose: () => void,
  onToggle: (tabId: string) => void,
  position: string,
  selected: string,
}

// Sidebar implementation for latest version of leaflet-sidebar-v2
export default class Sidebar extends MapComponent<Props, DivOverlayTypes> {
  static defaultProps = {
    collapsed: false,
    position: 'left',
  }

  onClose(e: React.SyntheticEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.props.onClose();
  }

  onToggle(e: React.MouseEvent, tabId: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.props.onToggle(tabId);
  }

  // Use tab props defined in route drawer to render the tab itself
  renderTab(tab: React.ReactElement<SidebarTabProps>): React.ReactNode {
    const { selected } = this.props;
    const { icon, id } = tab.props;
    const activeText = id === selected ? ' active' : '';
    return (
      <li className={activeText} key={id}>
        <a href={`#${id}`} role="tab" onClick={(e: React.MouseEvent): void => this.onToggle(e, id)}>
          {icon}
        </a>
      </li>
    );
  }

  renderTabContent(
    children: React.ReactElement<SidebarTabProps> | React.ReactElement<SidebarTabProps>[],
  ): React.ReactElement<SidebarTabProps>[] {
    const { selected } = this.props;
    return React.Children.map(children,
      (e: React.ReactElement<SidebarTabProps>) => React.cloneElement(e, {
        onClose: this.onClose.bind(this),
        active: e.props.id === selected,
      }));
  }

  render(): React.ReactElement<Props> {
    const {
      children: tabs, collapsed = false, id, position = 'left',
    } = this.props;
    const positionClass = `leaflet-sidebar-${position}`;
    const collapsedClass = collapsed ? 'collapsed' : '';
    return (
      <div
        id={id}
        className={`leaflet-sidebar leaflet-touch ${positionClass} ${collapsedClass}`}
      >
        <div className="leaflet-sidebar-tabs">
          <ul role="tablist">
            {React.Children.map(tabs, this.renderTab.bind(this))}
          </ul>
        </div>
        <div className="leaflet-sidebar-content">
          {this.renderTabContent(tabs)}
        </div>
      </div>
    );
  }
}
