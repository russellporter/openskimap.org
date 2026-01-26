import {
  Check as CheckIcon,
  Close as CloseIcon,
  Undo as UndoIcon,
} from "@mui/icons-material";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";

export interface TrackDrawingControlsProps {
  eventBus: EventBus;
  isDrawing: boolean;
  pointCount: number;
  trackLength: number;
}

export const TrackDrawingControls: React.FunctionComponent<
  TrackDrawingControlsProps
> = (props) => {
  const [trackName, setTrackName] = React.useState("My Track");

  if (!props.isDrawing) {
    return null;
  }

  const handleFinish = () => {
    props.eventBus.finishDrawingTrack(trackName);
    setTrackName("My Track");
  };

  const handleCancel = () => {
    props.eventBus.cancelDrawingTrack();
    setTrackName("My Track");
  };

  const handleUndo = () => {
    props.eventBus.removeLastDrawingTrackPoint();
  };

  const canFinish = props.pointCount >= 2;
  const canUndo = props.pointCount > 0;

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        top: 70,
        left: 12,
        zIndex: 1000,
        p: 2,
        minWidth: 300,
        maxWidth: 400,
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
        Drawing Track
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tap or click on the map to add points. Right-click or use Undo to remove
        the last point.
      </Typography>

      <TextField
        label="Track Name"
        value={trackName}
        onChange={(e) => setTrackName(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {props.pointCount} points | {props.trackLength.toFixed(1)} km
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UndoIcon />}
            onClick={handleUndo}
            disabled={!canUndo}
          >
            Undo
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloseIcon />}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckIcon />}
            onClick={handleFinish}
            disabled={!canFinish}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
