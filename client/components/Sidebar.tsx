import React from 'react';
import type { Props as SidebarTabProps } from './SidebarTab';

interface Props {
  children: React.ReactElement<SidebarTabProps> | React.ReactElement<SidebarTabProps>[],
  collapsed?: boolean,
  id: string,
  onClose: () => void,
  onToggle: (tabId: string) => void,
  position?: string,
  selected: string,
}

// Sidebar implementation for latest version of leaflet-sidebar-v2
// Renders HTML with defined CSS classes, does not use Sidebar JS modules
const Sidebar = ({
  children: tabs,
  collapsed = false,
  id,
  onClose,
  onToggle,
  position = 'left',
  selected,
}: Props): React.ReactElement<Props> => {
  const _onClose = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const _onToggle = (e: React.MouseEvent, tabId: string): void => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(tabId);
  };

  // Use tab props defined in route drawer to render the tab itself
  const renderTab = (tab: React.ReactElement<SidebarTabProps>): React.ReactNode => {
    const { icon, id: tabId } = tab.props;
    const activeText = tabId === selected ? ' active' : '';
    return (
      <li className={activeText} key={tabId}>
        <a href={`#${tabId}`} role="tab" onClick={(e: React.MouseEvent): void => _onToggle(e, tabId)}>
          {icon}
        </a>
      </li>
    );
  };

  const renderTabContent = (
    children: React.ReactElement<SidebarTabProps> | React.ReactElement<SidebarTabProps>[],
  ): React.ReactElement<SidebarTabProps>[] => React.Children.map(children,
    (e: React.ReactElement<SidebarTabProps>) => React.cloneElement(e, {
      onClose: _onClose,
      active: e.props.id === selected,
    }));

  const positionClass = `leaflet-sidebar-${position}`;
  const collapsedClass = collapsed ? 'collapsed' : '';
  return (
    <div
      id={id}
      className={`leaflet-sidebar leaflet-touch ${positionClass} ${collapsedClass}`}
    >
      <div className="leaflet-sidebar-tabs">
        <ul role="tablist">
          {React.Children.map(tabs, renderTab.bind(this))}
        </ul>
      </div>
      <div className="leaflet-sidebar-content">
        {renderTabContent(tabs)}
      </div>
    </div>
  );
};

export default Sidebar;
