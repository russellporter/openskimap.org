import EditIcon from "@mui/icons-material/Edit";
import InfoIcon from "@mui/icons-material/Info";
import LayersIcon from "@mui/icons-material/Layers";
import MapIcon from "@mui/icons-material/Map";
import PolicyIcon from "@mui/icons-material/Policy";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";
import * as ExternalURLOpener from "./ExternalURLOpener";

interface Props {
  eventBus: EventBus;
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
                key={"layers"}
                onClick={this.props.eventBus.openLayers}
              >
                <ListItemIcon>
                  <LayersIcon />
                </ListItemIcon>
                <ListItemText primary={"Layers"} />
              </ListItem>
              <ListItem
                button
                key={"legend"}
                onClick={() => this.props.eventBus.openLegend()}
              >
                <ListItemIcon>
                  <MapIcon />
                </ListItemIcon>
                <ListItemText primary={"Legend"} />
              </ListItem>
              <ListItem
                button
                key={"settings"}
                onClick={this.props.eventBus.openSettings}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary={"Settings"} />
              </ListItem>
              <Divider />
              <ListItem
                button
                key={"edit"}
                onClick={this.props.eventBus.editMap}
              >
                <ListItemIcon>
                  <EditIcon />
                </ListItemIcon>
                <ListItemText primary={"Edit Map"} />
              </ListItem>
              <Divider />
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
              <ListItem
                button
                key={"legal"}
                onClick={this.props.eventBus.openLegal}
              >
                <ListItemIcon>
                  <PolicyIcon />
                </ListItemIcon>
                <ListItemText primary={"Credits & Legal"} />
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
