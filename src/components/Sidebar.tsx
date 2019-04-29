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
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";

interface Props {
  eventBus: EventBus;
  selectedMapStyle: MapStyle;
  open: boolean;
}

export default class Sidebar extends React.Component<Props, {}> {
  render = () => {
    return (
      <Drawer anchor="left" open={this.props.open} onClose={this.close}>
        <div
          tabIndex={0}
          role="button"
          onClick={this.close}
          onKeyDown={this.close}
        >
          <div style={{ width: "256" }}>
            <List>
              <ListItem
                button
                key={"terrain"}
                onClick={() => {
                  this.props.eventBus.setMapStyle(MapStyle.Terrain);
                }}
                selected={this.props.selectedMapStyle === MapStyle.Terrain}
              >
                <ListItemIcon>
                  <TerrainIcon />
                </ListItemIcon>
                <ListItemText primary={"Terrain"} />
              </ListItem>
              <ListItem
                button
                key={"satellite"}
                onClick={() => {
                  this.props.eventBus.setMapStyle(MapStyle.Satellite);
                }}
                selected={this.props.selectedMapStyle === MapStyle.Satellite}
              >
                <ListItemIcon>
                  <SatelliteIcon />
                </ListItemIcon>
                <ListItemText primary={"Satellite"} />
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem
                button
                key={"edit"}
                onClick={this.props.eventBus.editMap}
              >
                <ListItemIcon>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText primary={"Edit"} />
              </ListItem>
              <ListItem
                button
                key={"about"}
                onClick={this.props.eventBus.openAboutInfo}
              >
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText primary={"About"} />
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem
                button
                key={"skimap.org"}
                onClick={() => {
                  window.location.href = "https://skimap.org";
                }}
              >
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
    this.props.eventBus.closeSidebar();
  };
}
