import {
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";
import { ModalHeader } from "./ModalHeader";

interface Props {
  eventBus: EventBus;
}

export default class About extends React.Component<Props> {
  render() {
    return (
      <>
        <ModalHeader onClose={() => this.props.eventBus.closeAboutInfo()}>
          <Typography variant="h5" id="modal-title">
            About
          </Typography>
        </ModalHeader>
        <Typography paragraph={true}>
          This map uses OpenStreetMap and Skimap.org data to show ski areas,
          runs, and lifts around the world. Backcountry ski routes, winter
          hiking, and sled trails are also displayed. You can add ski trails and
          lifts by{" "}
          <Link
            onClick={(e: any) => {
              e.preventDefault();
              this.props.eventBus.editMap();
            }}
            href="#"
            className="edit-map-button"
          >
            editing the map
          </Link>
          . After editing, it may take several days your changes to show up on
          the OpenSkiMap.
        </Typography>
        <Typography paragraph={true}>
          Want to see the world's largest collection of traditional ski maps?
          Visit{" "}
          <Link href="http://www.skimap.org" target="_blank">
            skimap.org
          </Link>
          .
        </Typography>
        <Typography paragraph={true}>
          Suggestions for improvements? Email{" "}
          <Link href="mailto:contact@skimap.org">contact@skimap.org</Link>.
        </Typography>
        <Typography variant="h6" id="modal-title">
          Acceptable Use
        </Typography>
        <Typography paragraph={true}>
          To manage costs, embedding of the website and direct use of tiles
          hosted at tiles.openskimap.org is not permitted. Please prepare and
          host your own tiles using the data below instead.
        </Typography>
        <Typography variant="h6" id="modal-title">
          Code
        </Typography>
        <Typography paragraph={true}>
          This project is{" "}
          <Link
            href="https://www.github.com/russellporter/openskimap.org"
            target="_blank"
          >
            open source on GitHub
          </Link>
          .
        </Typography>
        <Typography variant="h6" id="modal-title">
          Data Downloads
        </Typography>
        <Typography paragraph={true}>
          The following data is available for download under the license.
          GeoJSON format is spatial data with all attributes, while CSV is
          tabular data for easier analysis. Note that data formats are not
          stable and may change as the project evolves.
        </Typography>
        <Typography paragraph={true}>
          Use is subject to the Open Database license. You must attribute
          OpenSkiMap.org and OpenStreetMap appropriately.
        </Typography>
        <TableContainer sx={{ marginBottom: 2 }}>
          <Table size="small">
            <TableHead style={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell style={{ fontWeight: "bold" }}>Dataset</TableCell>
                <TableCell style={{ fontWeight: "bold" }}>GeoJSON</TableCell>
                <TableCell style={{ fontWeight: "bold" }}>CSV</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Ski Areas</TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/geojson/ski_areas.geojson">
                    Download
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/csv/ski_areas.csv">
                    Download
                  </Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Lifts</TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/geojson/lifts.geojson">
                    Download
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/csv/lifts.csv">
                    Download
                  </Link>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Runs</TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/geojson/runs.geojson">
                    Download
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href="https://tiles.openskimap.org/csv/runs.csv">
                    Download
                  </Link>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography paragraph={true}>
          The data is generally updated daily. It's permitted to automatically
          download the above files once per day.
        </Typography>
        <Typography variant="h6" id="modal-title">
          Credits
        </Typography>
        <Typography paragraph={true}>
          Map data is{" "}
          <Link href="https://www.openstreetmap.org/copyright" target="_blank">
            © OpenStreetMap contributors
          </Link>{" "}
          and <Link href="https://openskimap.org/?about">OpenSkiMap.org</Link>.
          Base map graciously provided by{" "}
          <Link href="https://openfreemap.org/">OpenFreeMap</Link>,{" "}
          <Link href="https://www.openmaptiles.org/">© OpenMapTiles</Link>.
          Satellite imagery <Link href="https://www.mapbox.com">© Mapbox</Link>{" "}
          and <Link href="https://www.maxar.com/">© Maxar</Link>. Terrain Data
          courtesy of{" "}
          <Link href="https://registry.opendata.aws/terrain-tiles/">
            Mapzen and AWS Open Data
          </Link>
          .
        </Typography>
        <Typography paragraph={true}>Terrain data licenses:</Typography>
        <Typography component="div" paragraph={true}>
          <ul>
            <li>
              ArcticDEM terrain data DEM(s) were created from DigitalGlobe,
              Inc., imagery and funded under National Science Foundation awards
              1043681, 1559691, and 1542736
            </li>
            <li>
              Australia terrain data © Commonwealth of Australia (Geoscience
              Australia) 2017
            </li>
            <li>
              Austria terrain data © offene Daten Österreichs – Digitales
              Geländemodell (DGM) Österreich
            </li>
            <li>
              Canada terrain data contains information licensed under the Open
              Government Licence – Canada
            </li>
            <li>
              Europe terrain data produced using Copernicus data and information
              funded by the European Union - EU-DEM layers
            </li>
            <li>
              Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric
              Administration
            </li>
            <li>Mexico terrain data source: INEGI, Continental relief, 2016</li>
            <li>
              New Zealand terrain data Copyright 2011 Crown copyright (c) Land
              Information New Zealand and the New Zealand Government (All rights
              reserved)
            </li>
            <li>Norway terrain data © Kartverket</li>
            <li>
              United Kingdom terrain data © Environment Agency copyright and/or
              database right 2015. All rights reserved
            </li>
            <li>
              United States 3DEP (formerly NED) and global GMTED2010 and SRTM
              terrain data courtesy of the U.S. Geological Survey
            </li>
          </ul>
        </Typography>
      </>
    );
  }
}
