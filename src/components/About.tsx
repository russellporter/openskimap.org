import { Link, Typography } from "@material-ui/core";
import { MuiThemeProvider } from "@material-ui/core/styles";
import * as React from "react";
import EventBus from "./EventBus";
import { theme } from "./Theme";

interface Props {
  eventBus: EventBus;
}

export default class About extends React.Component<Props> {
  render() {
    return (
      <div
        style={{
          position: "absolute",
          width: theme.spacing.unit * 50,
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[5],
          padding: theme.spacing.unit * 4,
          outline: "none",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        }}
      >
        <MuiThemeProvider theme={theme}>
          <Typography variant="h6" id="modal-title">
            About
          </Typography>
          <Typography>
            <p>
              This map uses OpenStreetMap data to show ski trails and lifts
              around the world. Backcountry ski routes are also displayed. You
              can add ski trails and lifts by{" "}
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
              .
            </p>

            <p>
              Want to see the world's largest collection of traditional ski
              maps? Visit <Link href="http://www.skimap.org">skimap.org</Link>
            </p>

            <p>
              Suggestions for improvements? Email{" "}
              <Link href="mailto:contact@skimap.org">contact@skimap.org</Link>
            </p>
          </Typography>
        </MuiThemeProvider>
      </div>
    );
  }
}
