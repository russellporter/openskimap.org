# OpenSkiMap.org

This repo contains the front end source code for OpenSkiMap.org.

## Overview

The main components of the website are organized in separate repos

- [Data processing pipeline](https://github.com/russellporter/openskidata-processor)
  - Takes in OpenStreetMap data and Skimap.org Ski Areas
  - Performs sanitization, normalization, and graph processing on the data
  - Produces Mapbox Vector Tiles & GeoJSON files per run & lift.
- [REST API](https://github.com/russellporter/api.openskimap.org), provides search and object details
- Mapbox GL style (not on Github, yet)
- Front end (this repo)

## Pre-reqs

- using the Node.js version specified in `.nvmrc`.
- yarn installed

## Development

1. Install dependencies: `yarn install`
2. Start the dev server: `yarn start`
