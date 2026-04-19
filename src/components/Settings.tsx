import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  Typography,
} from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";
import { ModalHeader } from "./ModalHeader";
import { UnitSystem } from "./utils/UnitHelpers";

interface Props {
  unitSystem: UnitSystem;
  terrainInspectorEnabled: boolean;
  terrainExaggeration: number;
  eventBus: EventBus;
}

function exaggerationToSlider(exaggeration: number): number {
  return Math.log10(Math.max(0.1, exaggeration));
}

function sliderToExaggeration(sliderValue: number): number {
  return Math.pow(10, sliderValue);
}

export default class Settings extends React.Component<Props> {
  render() {
    return (
      <>
        <ModalHeader onClose={() => this.props.eventBus.closeSettings()}>
          <Typography variant="h5" id="modal-title">
            Settings
          </Typography>
        </ModalHeader>

        <div style={{ minWidth: 300 }}>
          <FormControl>
            <FormLabel>
              {" "}
              <Typography fontSize="1.15rem" color="WindowText">
                Unit Style{" "}
              </Typography>
            </FormLabel>
            <RadioGroup
              value={this.props.unitSystem}
              onChange={(e) => {
                const newUnitSystem = (e.target as HTMLInputElement)
                  .value as UnitSystem;
                this.props.eventBus.setUnitSystem(newUnitSystem);
              }}
            >
              <FormControlLabel
                value="metric"
                control={<Radio />}
                label="Metric"
              />
              <FormControlLabel
                value="imperial"
                control={<Radio />}
                label="Imperial"
              />
            </RadioGroup>
          </FormControl>

          <div style={{ marginTop: 16 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={this.props.terrainInspectorEnabled}
                  onChange={(e) =>
                    this.props.eventBus.setTerrainInspectorEnabled(
                      e.target.checked,
                    )
                  }
                />
              }
              label={
                <div>
                  <Typography fontSize="1rem">Terrain Inspector</Typography>
                  <Typography fontSize="0.8rem" color="text.secondary">
                    Show elevation, slope &amp; aspect at a selected point
                  </Typography>
                </div>
              }
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <FormLabel>
              <Typography fontSize="1rem">Elevation Exaggeration</Typography>
              <Typography fontSize="0.8rem" color="text.secondary">
                Amplify or reduce vertical relief in 3D view
              </Typography>
            </FormLabel>
            <Box sx={{ mx: 1, mt: 1 }}>
              <Slider
                value={exaggerationToSlider(this.props.terrainExaggeration)}
                min={-1}
                max={Math.log10(20)}
                step={0.01}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) =>
                  `${Math.round(sliderToExaggeration(value) * 100)}%`
                }
                onChange={(_, value) =>
                  this.props.eventBus.setTerrainExaggeration(
                    sliderToExaggeration(value as number),
                  )
                }
              />
            </Box>
          </div>
        </div>
      </>
    );
  }
}
