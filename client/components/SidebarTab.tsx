import React from 'react';
import { Icon } from 'react-feather';

export interface Props {
  children: React.ReactElement,
  header: string,
  icon: React.ReactElement<Icon>,
  // Path override for link and route paths
  linkPath?: string | null,
  // Path for link, route, and to determine current tab color and toggle
  path: string,
}

// NOTE: This functional component isn't used, instead children get mapped in Sidebar.
const SidebarTab = ({ children }: Props): React.ReactElement<Props> => <div>{children}</div>;

export default SidebarTab;
