import { Paper, Typography } from "@mui/material";
import FileUploadIcon from "@mui/icons-material/FileUpload";

interface GpxDropZoneProps {
  visible: boolean;
}

export function GpxDropZone({ visible }: GpxDropZoneProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          padding: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          borderRadius: 3,
          border: "3px dashed",
          borderColor: "primary.main",
          backgroundColor: "background.paper",
        }}
      >
        <FileUploadIcon sx={{ fontSize: 64, color: "primary.main" }} />
        <Typography variant="h5" color="primary">
          Drop GPX file to add track
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Release to upload your GPX track to the map
        </Typography>
      </Paper>
    </div>
  );
}
