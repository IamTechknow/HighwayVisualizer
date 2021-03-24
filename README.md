# HighwayVisualizer

[HighwayVisualizer](https://iamtechknow.dev) is a tool designed to render geodata of highway systems in the United States and to allow users to create their own travel segments.

## Instructions

Clone this repo, then install the NPM packages. Ensure the mysql daemon has started with `mysqld --console` if not already active as a system service. Ensure the redis instance has started as well. Download the ZIP file of the Shapefile for California's state highway system, extract `SHN_Lines.shp` and `SHN_Lines.dbf` to the `db` folder. Start a terminal window and run `npm run seed --seed && npm run build && npm run debug`. Now you may go to localhost to access the site!

## Video

A video of this project based on the commit tagged `mvp` may be found [here](https://youtu.be/i92g7lDWulA).

## Specification

User Stories:

* [X] As a user, I can view highway routes of a state on a map
* [X] As a user, I can view route segments of a highway route, both individually and the route as a whole
* [X] As a user, I can create a user to add travel segments of a route
* [X] As a user, I can click on two points of a route segment to define a travel segment
  * [X] As a user, I can click once on a route segment to an info popup
  * [X] As a user, I can click on two route segments and create travel segments for the two route segments and all in between
  * [X] As a user, I can use the clinch mode to automatically create a travel segment by clicking on a route or segment
* [X] As a user, I can search for quick access to routes
* [X] As a user, I can view travel segments defined by other users
* [X] As a user, I can see stats on the highways I have travelled on
* [ ] As a user, I can log in as myself to be able to submit data
* [ ] As a user, I can toggle some features on or off
* [X] As a developer, I can seed highway data for any state from the FHWA [website](https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles.cfm)
* [ ] As a developer, there is adequate test coverage in the frontend

## Tech Stack and Libraries used

* Node.js
* Express.js
* MySQL
* Redis
* TypeScript (on frontend)
* React.js
* Webpack
* Leaflet (via react-leaflet)
* Jest
* Enzyme

## REST API

The web server exposes a REST API used by the web client, documented [here](https://github.com/IamTechknow/HighwayVisualizer/tree/master/server/README.md).

## Attributions

* The geodata for California's state highway system was used. It may be found [here](https://gisdata-caltrans.opendata.arcgis.com/datasets/77f2d7ba94e040a78bfbe36feb6279da_0).
* Geodata for each state may be found [here](https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles_2017.cfm).
* The JSDoc style guide used may be found [here](https://github.com/shri/JSDoc-Style-Guide).
