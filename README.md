# HighwayVisualizer

## Instructions
Clone this repo, then install the NPM packages. Ensure the mysql daemon has started with `mysqld --console` if not already active as a system service. Start a terminal window and run `npm run seed`. Then start another terminal window, and run `npm run start` and `npm run react`. Now you may go to localhost to access the site!

## Video
A video of this project based on the commit tagged `mvp` may be found [here](https://youtu.be/i92g7lDWulA).

## Specification
User Stories:
  * [X] As a user, I can view highway routes of a state on a map
  * [X] As a user, I can view segments of a highway route, both individually and the route as a whole
  * [X] As a user, I can create a user to add custom segments of a route
  * [X] As a user, I can click on two ends of a segment to define a custom user segment
    * [X] As a user, I can click on two route segments and create user segments for the two route segments and all in between
    * [X] As a user, I can use the clinch mode to automatically create a user segment by clicking on a route or segment
  * [X] As a user, I can search for quick access to routes
  * [X] As a user, I can view segments of routes defined by other users
  * [X] As a user, I can see stats on the highways I have travelled on
  * [X] As a developer, I can seed highway data for any state from the FHWA [website](https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles.cfm).

## Attributions
  * The geodata for California's state highway system was used. It may be found [here](http://www.dot.ca.gov/hq/tsip/gis/datalibrary/).
  * Geodata for each state may be found [here](https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles.cfm).
