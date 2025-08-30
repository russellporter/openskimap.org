import { Dialog, FormControlLabel, Radio, RadioGroup, Switch, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import { MapStyle, MapStyleOverlay } from "../MapStyle";
import EventBus from "./EventBus";
import { ModalHeader } from "./ModalHeader";

export interface LayersModalProps {
  open: boolean;
  eventBus: EventBus;
  currentMapStyle: MapStyle;
  currentMapStyleOverlay: MapStyleOverlay | null;
}

export const LayersModal: React.FunctionComponent<LayersModalProps> = (props) => {
  const handleMapStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStyle = event.target.value as MapStyle;
    props.eventBus.setMapStyle(newStyle);
  };

  const handleSlopeOverlayChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    props.eventBus.setMapStyleOverlay(enabled ? MapStyleOverlay.Slope : null);
  };

  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeLayers();
      }}
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <ModalHeader onClose={() => props.eventBus.closeLayers()}>
          <Typography variant="h6">Layers</Typography>
        </ModalHeader>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Base Map
          </Typography>
          <RadioGroup
            value={props.currentMapStyle}
            onChange={handleMapStyleChange}
            sx={{ pl: 1 }}
          >
            <FormControlLabel
              value={MapStyle.Terrain}
              control={<Radio />}
              label="Terrain"
            />
            <FormControlLabel
              value={MapStyle.Satellite}
              control={<Radio />}
              label="Satellite"
            />
          </RadioGroup>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Overlays
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={props.currentMapStyleOverlay === MapStyleOverlay.Slope}
                onChange={handleSlopeOverlayChange}
              />
            }
            label="Slope"
            sx={{ pl: 1 }}
          />
        </Box>
      </Box>
    </Dialog>
  );
};