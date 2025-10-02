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
          Use is subject to several licenses. You must attribute
          OpenSkiMap.org, OpenStreetMap, and <Link
            onClick={(e: any) => {
              e.preventDefault();
              this.props.eventBus.openLegal();
            }}
            href="#"
          >terrain data providers</Link> appropriately.
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
      </>
    );
  }
}
