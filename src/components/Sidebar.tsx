import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import SatelliteIcon from "@mui/icons-material/Satellite";
import TerrainIcon from "@mui/icons-material/Terrain";
import * as React from "react";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import * as ExternalURLOpener from "./ExternalURLOpener";

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
              <ListItem button onClick={ExternalURLOpener.openPrivacyPolicy}>
                <ListItemText primary={"Privacy Policy"} />
              </ListItem>
              <ListItem button onClick={ExternalURLOpener.openCookiePolicy}>
                <ListItemText primary={"Cookie Policy"} />
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
