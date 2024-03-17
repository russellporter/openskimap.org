import {
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Switch,
} from "@material-ui/core";
import { Map } from "@material-ui/icons";
import EditIcon from "@material-ui/icons/Edit";
import InfoIcon from "@material-ui/icons/Info";
import SatelliteIcon from "@material-ui/icons/Satellite";
import TerrainIcon from "@material-ui/icons/Terrain";
import Warning from "@material-ui/icons/Warning";
import * as React from "react";
import MapFilters from "../MapFilters";
import { MapOverlay } from "../MapOverlay";
import { MapStyle } from "../MapStyle";
import EventBus from "./EventBus";
import * as ExternalURLOpener from "./ExternalURLOpener";

interface Props {
  eventBus: EventBus;
  selectedMapStyle: MapStyle;
  mapFilters: MapFilters;
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
                key={"legend"}
                onClick={() => {
                  this.props.eventBus.openLegend();
                }}
              >
                <ListItemIcon>
                  <Map />
                </ListItemIcon>
                <ListItemText primary={"Legend"} />
              </ListItem>
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
              <Divider />
              <ListSubheader>Style</ListSubheader>
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
              <Divider />
              <ListSubheader>Overlays</ListSubheader>
              <ListItem key={"slope_classes"}>
                <ListItemIcon>
                  <Warning />
                </ListItemIcon>
                <ListItemText primary={"Slope Class"} secondary={"Alps only"} />
                <Switch
                  edge="end"
                  onChange={(_, checked) => {
                    this.props.eventBus.setOverlayEnabled(
                      MapOverlay.SlopeClasses,
                      checked
                    );
                  }}
                  checked={this.props.mapFilters.slopeClassesEnabled}
                />
              </ListItem>
              <Divider />
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
