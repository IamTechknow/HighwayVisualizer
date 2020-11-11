import React from 'react';

interface Props {
  children: React.ReactElement | React.ReactElement[],
  title: string,
  open?: boolean,
}

const Collapsible = ({ children, title, open = false }: Props): React.ReactElement<Props> => (
  <div className="wrap-collapsible">
    <input id={`collapsible-${title}`} className="toggle" type="checkbox" defaultChecked={open} />
    <label htmlFor={`collapsible-${title}`} className="lbl-toggle">{title}</label>
    <div className="collapsible-content">
      <div className="content-inner">
        {children}
      </div>
    </div>
  </div>
);

export default Collapsible;
