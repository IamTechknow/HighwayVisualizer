import PropTypes from 'prop-types';
import React from 'react';

const Collapsible = ({ children, title, open = '' }) => (
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

Collapsible.propTypes = {
  children: PropTypes.node.isRequired,
  open: PropTypes.string,
  title: PropTypes.string.isRequired,
};

Collapsible.defaultProps = {
  open: '',
};

export default Collapsible;
