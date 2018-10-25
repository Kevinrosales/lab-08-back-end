# City Explorer Backend

**Authors**: Roger Huba, Scott Currie
**Version**: 1.0.0 (increment the patch/fix version number if you make more commits past your first submission)

## Overview
This application provides a backend implementation providing the following functionality:
1. Take in a location by name and query Google's Geocoding API to find latitude and longitude
2. Query the Dark Sky API to get weather forecast data for the supplied location
3. Query The Movie DB API to get movie results related to the location

## Getting Started
Configure and build a Node.js instance and run server.js

## Architecture
<!-- Provide a detailed description of the application design. What technologies (languages, libraries, etc) you're using, and any other relevant design information. -->
Requires Node.js. Requires API keys for Google's Geocoding API, themoviedb,org API, Yelp's Fusion API, Dark Sky weather API.

## Change Log
<!-- Use this area to document the iterative changes made to your application as each feature is successfully implemented. Use time stamps. Here's an examples:
01-01-2001 4:59pm - Application now has a fully-functional express server, with a GET route for the location resource.
-->
10-23-2018 10:30am - Connected existing code to Google Geocoding and Dark Sky API's
10-23-2018 11:00am - Completed functinoality of Yelp API lookups
10-23-2018 12:30pm - Completed functionality of Movie API lookups

## Credits and Collaborations
<!-- Give credit (and a link) to other people or resources that helped you build this application. -->
Starting code was a collaboration with Lena Elvy (https://github.com/applena)