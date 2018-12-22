import React from 'react';
import ReactDOM from 'react-dom';

const Collapsible = ({ children, title, open = false }) => (
  <div className="wrap-collabsible">
    <input id={`collapsible-${title}`} className="toggle" type="checkbox" defaultChecked={open}/>
    <label htmlFor={`collapsible-${title}`} className="lbl-toggle">{title}</label>
    <div className="collapsible-content">
      <div className="content-inner">
        {children}
      </div>
    </div>
  </div>
);

export default Collapsible;
