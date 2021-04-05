# REST API

## Overview

Web API | HTTP Method | URL | Description
--------| ----- | ------------- | -------------
States | GET | /api/states | Get all US states with segments
Segments by State | GET | /api/segments/:stateId | Get segment metadata for the US state
Points by Segment | GET | /api/points/:segmentId | Get all coordinates for a US state segment
Points by Route | GET | /api/points/:type/:routeNum | Get all coordinates for a US state route
Concurrencies by Route | GET | /api/concurrencies/:routeNum | Get all coordinates for route concurrencies for the given route
Users | GET | /api/users | Get the ID and name for each user
Travel Segments by User | GET | /api/travel_segments/:user | Get the user's travel segments
Create new user | POST (JSON) | /api/newUser | Create a new user (does not support authentication)
Submit travel segment | POST (JSON) | /api/travel_segments/new | Submit a travel segment for the specified user (does not support authentication)

## API Types

### State

Parameter | Value(s) | Description
------------- | ------------- | -------------
id | integer | Unique ID representing a state and its highway system
identifier | string | Identifier of a state used internally, only contains upper or lower case letters
title | string | Title of a state that is displayed to the user, may contain spaces
initials | string | Initials of a state that is displayed to the user

### Segment

Parameter | Value(s) | Description
------------- | ------------- | -------------
id | integer | Unique ID representing a discrete segment of a route.
routeNum | string | The route number for the state's highway system, may contain letters
type | integer | Route signage type as defined in the FHWA HPMS manual. May be 2, 3, or 4, representing Interstate signage, U.S. highway signage, or state highway.
segNum | integer | Sequence number describing the position of the segment in the route
dir | string | N, E, S, or W, depending on the route
len | integer | Number of points in the segment
len_m | number | Total approximate polyline length of the segment in meters.

### SegmentPolyline

Parameter | Value(s) | Description
------------- | ------------- | -------------
id | integer | Unique ID of the segment
points | Number[][] | Array of 2-tuple coordinates representing the segment

### User

Parameter | Value(s) | Description
------------- | ------------- | -------------
id | number | Unique ID of the user
user | string | Name of the User

### TravelSegment

Parameter | Value(s) | Description
------------- | ------------- | -------------
routeNum | string | Route number for the state's highway system, may contain letters
segmentId | integer | Unique ID of the segment
startId | integer | Number of the point the travel segment starts
endId | integer | Number of the point the travel segment ends
clinched | boolean | Whether the user has traveled through this segment entirely

### TravelStatSegment (inherits all fields in travel segment)

Parameter | Value(s) | Description
------------- | ------------- | -------------
points | Number[][] | Array of 2-tuple coordinates representing the travel segment

### TravelStat

Parameter | Value(s) | Description
------------- | ------------- | -------------
percentage | string | String representation of percentage of segment traveled
route | string | Route number of the travel segment
segment | number | Unique ID of the segment
state | string | State title
total | number | Total length of the travel segment
traveled | number | Length of the segment traveled by the user

### TravelStatsAPIPayload

Parameter | Value(s) | Description
------------- | ------------- | -------------
loaded | boolean | Value not used currently
notFound | boolean | Whether stats for the user were found
stats | TravelStat[] | Statistics for given travel segments
travelSegments | TravelStatSegment[] | Polylines for the travel segments

## States

`/api/states`

Return value: `State[]`

Parameter | Value(s) | Description
------------- | ------------- | -------------
(No parameters supported) |

## Segments

`/api/segments/:stateId`

Return value: `Segment[]`

Parameter | Value(s) | Description
------------- | ------------- | -------------
stateId | integer | Unique ID representing a state and its highway system

## Points by Segment

`/api/points/:segmentId`

Return value: `SegmentPolyLine`

Parameter | Value(s) | Description
------------- | ------------- | -------------
segmentId | integer | Unique ID of the segment

## Points by Route

`/api/points/:type/:routeNum?stateId={stateId}&dir={dir}`

Return value: `SegmentPolyLine[]`

Parameter | Value(s) | Description
------------- | ------------- | -------------
dir | string | N, E, S, or W, depending on the route
routeNum | string | Alpha-numeric string of the route, up to 4 characters
stateId | number | Unique ID representing a state and its highway system
type | integer | Route signage type as defined in the FHWA HPMS manual. May be 2, 3, or 4, representing Interstate signage, U.S. highway signage, or state highway.

## Concurrencies by Route

`/api/concurrencies/:routeNum?stateId={stateId}&dir={dir}`

Return value: `SegmentPolyLine[]`

Parameter | Value(s) | Description
------------- | ------------- | -------------
dir | string | N, E, S, or W, depending on the route
routeNum | string | Alpha-numeric string of the route, up to 4 characters
stateId | number | Unique ID representing a state and its highway system

## Users

`/api/users`

Return value: `User[]`

Parameter | Value(s) | Description
------------- | ------------- | -------------
(No parameters supported) |

## Travel Segments

`/api/travel_segments/:user`

Return value: `TravelStatsAPIPayload`

Parameter | Value(s) | Description
------------- | ------------- | -------------
user | /api/v1/user/register | Name of the user to find user submitted segments

## Create new user

`/api/newUser`

Parameter | Value(s) | Description
------------- | ------------- | -------------
user | string | Name for the new user. It must be between 3 to 16 characters and contain only lowercase letters, numbers, dashes, or underscores.

## Submit travel segment

`/api/travel_segments/new`

Parameter | Value(s) | Description
------------- | ------------- | -------------
userId | string | Unique ID of the user to associate the travel segments
travelSegments | TravelSegment[] | Serialized array of travel segments to add
