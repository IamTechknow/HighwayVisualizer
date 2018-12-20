# HighwayVisualizer

## Instructions
Clone this repo, then install the NPM packages. Ensure the mysql daemon has started with `mysqld --console` if not already active. Start a terminal window and run `npm run seed`. Then start another terminal window, and run `npm run start` and `npm run react`. Now you may go to localhost to access the site!

## Video
A video of this project based on the commit tagged `mvp` may be found [here](https://youtu.be/i92g7lDWulA).

## Specification
User Stories:
  * [X] As a user, I can view highway routes of a state on a map
  * [X] As a user, I can view segments of a highway route, both individually and the route as a whole
  * [X] As a user, I can create a user to add custom segments of a route
  * [ ] As a user, I can click on two ends of a segment to define a custom user segment
  * [X] As a user, I can view segments of routes defined by other users
  * [ ] As a user, I can see stats on the highways I have travelled on
  * [ ] As a developer, I can seed highway data for any state from the FHWA [website](https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles.cfm).

## Attributions
  * The geodata for California's state highway system was used. It may be found [here](http://www.dot.ca.gov/hq/tsip/gis/datalibrary/).
