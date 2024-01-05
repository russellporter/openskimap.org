import { Link, Typography } from "@material-ui/core";
import * as React from "react";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";

interface Props {
  eventBus: EventBus;
}

export default class About extends React.Component<Props> {
  render() {
    return (
      <>
        <InfoHeader onClose={() => this.props.eventBus.closeAboutInfo()}>
          <Typography variant="h5" id="modal-title">
            About
          </Typography>
        </InfoHeader>
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
          </Link>
          .
        </Typography>
        <Typography paragraph={true}>
          Use is subject to the Open Database license. You must attribute
          OpenSkiMap.org and OpenStreetMap appropriately.
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
          Data
        </Typography>
        <Typography paragraph={true}>
          GeoJSON data is available under the license. Note that the data format
          is not stable and changes on a regular basis as the project evolves.
        </Typography>
        <Typography>
          <ul>
            <li>
              <Link href="https://tiles.skimap.org/geojson/ski_areas.geojson">
                Ski Areas
              </Link>
            </li>
            <li>
              <Link href="https://tiles.skimap.org/geojson/lifts.geojson">
                Lifts
              </Link>
            </li>
            <li>
              <Link href="https://tiles.skimap.org/geojson/runs.geojson">
                Runs
              </Link>
            </li>
          </ul>
        </Typography>
        <Typography paragraph={true}>
          Mapbox Vector Tiles based on the above GeoJSON are also available
          under the license. See the{" "}
          <Link href="https://tiles.skimap.org/openskimap.json">
            TileJSON definition
          </Link>{" "}
          for usage.
        </Typography>
      </>
    );
  }
}
