import React from 'react';

export default (): React.ReactElement => (
  <div className="tabContent">
    <h3>About</h3>
    <p>
      HighwayVisualizer is a tool designed to render geodata of highway systems
      in the United States and to allow users to create travel segments of
      highways they have traveled on.
    </p>
    <h3>Note on Travel Mapping</h3>
    <p>
      Neither this project nor the developer(s) of HighwayVisualizer are affilated
      with the
      {' '}
      <a href="https://travelmapping.net/">Travel Mapping project</a>
      &nbsp;which serves a similar purpose.
    </p>
    <h3>Repository Info</h3>
    <p>
      The project&apos;s code repository and attributions may be found on&nbsp;
      <a href="https://github.com/IamTechknow/HighwayVisualizer">Github</a>
      .
    </p>
  </div>
);
