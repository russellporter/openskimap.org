import { Link, Typography } from "@mui/material";
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
          License
        </Typography>
        <Typography paragraph={true}>
          Map data is{" "}
          <Link href="https://www.openstreetmap.org/copyright" target="_blank">
            © OpenStreetMap contributors
          </Link>{" "}
          and <Link href="https://openskimap.org/?about">OpenSkiMap.org</Link>.
        </Typography>
        <Typography paragraph={true}>
          Use is subject to the Open Database license. You must attribute
          OpenSkiMap.org and OpenStreetMap appropriately.
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
          GeoJSON Data
        </Typography>
        <Typography paragraph={true}>
          GeoJSON data is available for download under the license. Note that
          the data format is not stable and changes on a regular basis as the
          project evolves.
        </Typography>
        <Typography component="div">
          <ul>
            <li>
              <Link href="https://tiles.openskimap.org/geojson/ski_areas.geojson">
                Ski Areas
              </Link>
            </li>
            <li>
              <Link href="https://tiles.openskimap.org/geojson/lifts.geojson">
                Lifts
              </Link>
            </li>
            <li>
              <Link href="https://tiles.openskimap.org/geojson/runs.geojson">
                Runs
              </Link>
            </li>
          </ul>
        </Typography>
        <Typography paragraph={true}>
          The data is generally updated daily. It's permitted to automatically
          download the above files once per day.
        </Typography>
      </>
    );
  }
}
