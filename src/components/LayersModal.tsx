import {
  Close as CloseIcon,
  Create as CreateIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from "@mui/icons-material";
import {
  Button,
  Dialog,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { SkiAreaActivity } from "openskidata-format";
import * as React from "react";
import MapFilters from "../MapFilters";
import { MapStyle, MapStyleOverlay, SLOPE_OVERLAY_NAMES } from "../MapStyle";
import { Track, readGpxFile } from "../utils/TrackParser";
import { DownhillCheckbox, NordicCheckbox } from "./Checkbox";
import EventBus from "./EventBus";
import { ModalHeader } from "./ModalHeader";
import { UnitSystemManager } from "./UnitSystemManager";
import * as UnitHelpers from "./utils/UnitHelpers";

export interface LayersModalProps {
  open: boolean;
  eventBus: EventBus;
  currentMapStyle: MapStyle;
  currentMapStyleOverlay: MapStyleOverlay | null;
  tracks: Track[];
  sunExposureDate: Date;
  mapFilters: MapFilters;
  visibleSkiAreasCount: number;
}

export const LayersModal: React.FunctionComponent<LayersModalProps> = (
  props,
) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMapStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStyle = event.target.value as MapStyle;
    props.eventBus.setMapStyle(newStyle);
  };

  const handleSlopeOverlayChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    if (value === "none") {
      props.eventBus.setMapStyleOverlay(null);
    } else {
      props.eventBus.setMapStyleOverlay(value as MapStyleOverlay);
    }
  };

  const handleGpxFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      alert("Please select a GPX file");
      return;
    }

    setIsUploading(true);
    try {
      const tracks = await readGpxFile(file);
      for (const track of tracks) {
        props.eventBus.addTrack(track);
      }
    } catch (error) {
      console.error("Error parsing GPX file:", error);
      alert(
        error instanceof Error ? error.message : "Failed to parse GPX file",
      );
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveTrack = (track: Track) => {
    if (window.confirm(`Remove "${track.name}"?`)) {
      props.eventBus.removeTrack(track.id);
    }
  };

  const handleGpxUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreateTrack = () => {
    props.eventBus.startDrawingTrack();
  };

  const handleDownloadTrack = (track: Track) => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSkiMap.org" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <trk>
    <name>${track.name}</name>
    <trkseg>
${track.coordinates.map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`).join("\n")}
    </trkseg>
  </trk>
</gpx>`;

    downloadFile(gpxContent, `${track.name.replace(/[^a-z0-9]/gi, "_")}.gpx`);
  };

  const handleDownloadAllTracks = () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="OpenSkiMap.org" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
${props.tracks
  .map(
    (track) => `  <trk>
    <name>${track.name}</name>
    <trkseg>
${track.coordinates.map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`).join("\n")}
    </trkseg>
  </trk>`,
  )
  .join("\n")}
</gpx>`;

    downloadFile(gpxContent, "openskimap_tracks.gpx");
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDownhillEnabled = !props.mapFilters.hiddenActivities.includes(
    SkiAreaActivity.Downhill,
  );
  const isNordicEnabled = !props.mapFilters.hiddenActivities.includes(
    SkiAreaActivity.Nordic,
  );

  const initialMinElevationValue = React.useRef(
    props.mapFilters.minElevation || 0,
  ).current;
  const initialMinVerticalValue = React.useRef(
    props.mapFilters.minVertical || 0,
  ).current;
  const initialMinRunLengthValue = React.useRef(
    props.mapFilters.minRunLength || 0,
  ).current;

  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeLayers();
      }}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <ModalHeader onClose={() => props.eventBus.closeLayers()}>
          <Typography variant="h6">Layers</Typography>
        </ModalHeader>

        {/* Two-column grid: existing sections left, new sections right */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 3,
            mt: 2,
          }}
        >
          {/* Left column: Activities + Ski Areas */}
          <Box>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Activities
              </Typography>
              <FormGroup sx={{ pl: 1 }}>
                <FormControlLabel
                  control={
                    <DownhillCheckbox
                      checked={isDownhillEnabled}
                      onChange={() =>
                        props.eventBus.toggleActivity(SkiAreaActivity.Downhill)
                      }
                    />
                  }
                  label="Downhill &amp; Backcountry"
                />
                <FormControlLabel
                  control={
                    <NordicCheckbox
                      checked={isNordicEnabled}
                      onChange={() =>
                        props.eventBus.toggleActivity(SkiAreaActivity.Nordic)
                      }
                    />
                  }
                  label="Nordic"
                />
              </FormGroup>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Ski Areas
              </Typography>
              <UnitSystemManager
                render={(unitSystem) => (
                  <Box sx={{ pl: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <FormLabel component="legend">
                        Minimum Elevation (
                        {UnitHelpers.labelForLengthUnit(
                          UnitHelpers.closestEquivalent("meters", unitSystem),
                        )}
                        )
                      </FormLabel>
                      <Box sx={{ mx: 1 }}>
                        <Slider
                          defaultValue={initialMinElevationValue}
                          min={0}
                          max={5000}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) =>
                            UnitHelpers.heightText(value, unitSystem, true)
                          }
                          onChange={(_, value) =>
                            props.eventBus.setMinimumElevation(value as number)
                          }
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <FormLabel component="legend">
                        Minimum Vertical (
                        {UnitHelpers.labelForLengthUnit(
                          UnitHelpers.closestEquivalent("meters", unitSystem),
                        )}
                        )
                      </FormLabel>
                      <Box sx={{ mx: 1 }}>
                        <Slider
                          defaultValue={initialMinVerticalValue}
                          min={0}
                          max={2000}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) =>
                            UnitHelpers.heightText(value, unitSystem, true)
                          }
                          onChange={(_, value) =>
                            props.eventBus.setMinimumVertical(value as number)
                          }
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <FormLabel component="legend">
                        Run Length (
                        {UnitHelpers.labelForLengthUnit(
                          UnitHelpers.closestEquivalent(
                            "kilometers",
                            unitSystem,
                          ),
                        )}
                        )
                      </FormLabel>
                      <Box sx={{ mx: 1 }}>
                        <Slider
                          defaultValue={initialMinRunLengthValue}
                          min={0}
                          max={500}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) =>
                            UnitHelpers.distanceText({
                              distanceInMeters: value * 1000,
                              unitSystem,
                              forceLongestUnit: true,
                              withSpace: true,
                              roundToNearestDecimal: true,
                            })
                          }
                          onChange={(_, value) =>
                            props.eventBus.setMinimumRunLength(value as number)
                          }
                        />
                      </Box>
                    </Box>
                    <Typography variant="subtitle2">
                      {props.visibleSkiAreasCount} visible ski areas
                    </Typography>
                  </Box>
                )}
              />
            </Box>
          </Box>

          {/* Right column: Base Map + Slope Overlays */}
          <Box>
            <Box>
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1">
                  Slope Overlays{" "}
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ color: "text.secondary", fontStyle: "italic" }}
                  >
                    (Experimental)
                  </Typography>
                </Typography>
                <Button
                  size="small"
                  onClick={() => props.eventBus.openLegend("slope-overlays")}
                >
                  Legend
                </Button>
              </Box>
              <RadioGroup
                value={props.currentMapStyleOverlay || "none"}
                onChange={handleSlopeOverlayChange}
                sx={{ pl: 1 }}
              >
                <FormControlLabel
                  value="none"
                  control={<Radio />}
                  label="None"
                />
                {Object.entries(SLOPE_OVERLAY_NAMES).map(([key, name]) => {
                  const label =
                    key === MapStyleOverlay.SunExposure
                      ? `${name} (${props.sunExposureDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`
                      : name;
                  return (
                    <FormControlLabel
                      key={key}
                      value={key}
                      control={<Radio />}
                      label={label}
                    />
                  );
                })}
              </RadioGroup>

              {props.currentMapStyleOverlay === MapStyleOverlay.SunExposure && (
                <Box sx={{ mt: 2, pl: 4 }}>
                  <TextField
                    type="date"
                    label="Date for sun calculation"
                    value={props.sunExposureDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        props.eventBus.setSunExposureDate(newDate);
                      }
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    size="small"
                    fullWidth
                    sx={{ maxWidth: 200 }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Tracks section — full width */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Tracks
          </Typography>

          {props.tracks.length > 0 && (
            <Box sx={{ mb: 2, pl: 1 }}>
              {props.tracks.map((track) => (
                <Box
                  key={track.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    bgcolor: "background.paper",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: track.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {track.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({track.lengthKm} km)
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex" }}>
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadTrack(track)}
                      title="Download GPX"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveTrack(track)}
                      title="Remove track"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Box sx={{ pl: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<CreateIcon />}
              onClick={handleCreateTrack}
              size="small"
            >
              Draw Track
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleGpxUploadClick}
              disabled={isUploading}
              size="small"
            >
              {isUploading ? "Uploading..." : "Upload Track (.gpx)"}
            </Button>
            {props.tracks.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadAllTracks}
                size="small"
              >
                Download All
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx"
              onChange={handleGpxFileUpload}
              style={{ display: "none" }}
            />
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};
