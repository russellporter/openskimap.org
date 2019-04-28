import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@material-ui/core";
import BookmarkIcon from "@material-ui/icons/Bookmark";
import EditIcon from "@material-ui/icons/Edit";
import InfoIcon from "@material-ui/icons/Info";
import SatelliteIcon from "@material-ui/icons/Satellite";
import TerrainIcon from "@material-ui/icons/Terrain";
import * as React from "react";

interface Props {}

export default class Sidebar extends React.Component<Props, { open: boolean }> {
  constructor(props: Props) {
    super(props);

    this.state = { open: false };
  }

  render = () => {
    return (
      <Drawer anchor="left" open={this.state.open} onClose={this.close}>
        <div
          tabIndex={0}
          role="button"
          onClick={this.close}
          onKeyDown={this.close}
        >
          <div style={{ width: "256" }}>
            <List>
              <ListItem button key={"terrain"}>
                <ListItemIcon>
                  <TerrainIcon />
                </ListItemIcon>
                <ListItemText primary={"Terrain"} />
              </ListItem>
              <ListItem button key={"satellite"}>
                <ListItemIcon>
                  <SatelliteIcon />
                </ListItemIcon>
                <ListItemText primary={"Satellite"} />
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem button key={"edit"}>
                <ListItemIcon>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText primary={"Edit"} />
              </ListItem>
              <ListItem button key={"about"}>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText primary={"About"} />
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem button key={"skimap.org"}>
                <ListItemIcon>
                  <BookmarkIcon />
                </ListItemIcon>
                <ListItemText primary={"Skimap.org"} />
              </ListItem>
            </List>
          </div>
        </div>
      </Drawer>
    );
  };

  close = () => {
    this.setState({ open: false });
  };
}
