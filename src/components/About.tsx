import { Link, Typography } from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";
import { EmbedCode } from "./EmbedCode";
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
          Embedding
        </Typography>
        <Typography paragraph={true}>
          Embedding of the website in an iframe is permitted.
        </Typography>
        <EmbedCode />
        <Typography
          variant="body2"
          color="text.secondary"
          paragraph={true}
        >
          To link to a specific feature, include both the <code>obj</code> query
          parameter and the location hash. Feature IDs may change over time — the
          location hash ensures the map still shows the right area.
        </Typography>
        <Typography variant="h6" id="modal-title">
          Acceptable Use
        </Typography>
        <Typography paragraph={true}>
          Direct use of tiles hosted at tiles.openskimap.org is not permitted.
          Please prepare and host your own tiles using the data from{" "}
          <Link href="https://openskidata.org" target="_blank">
            openskidata.org
          </Link>{" "}
          instead.
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
          Ski area, run, lift and spot data is available for download in
          GeoJSON, CSV and GeoPackage format at{" "}
          <Link href="https://openskidata.org" target="_blank">
            openskidata.org
          </Link>
          , along with the schema and licensing details.
        </Typography>
      </>
    );
  }
}
