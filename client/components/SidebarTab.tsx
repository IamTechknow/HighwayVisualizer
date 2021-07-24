import React from 'react';
import { Icon } from 'react-feather';

export interface Props {
  activeHash: string,
  children: React.ReactElement,
  exact?: boolean,
  header: string,
  icon: React.ReactElement<Icon>,
  path: string,
}

// NOTE: This functional component isn't used, instead children get mapped in Sidebar.
const SidebarTab = ({ children }: Props): React.ReactElement<Props> => <div>{children}</div>;

export default SidebarTab;
