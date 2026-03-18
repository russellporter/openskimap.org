import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
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
  eventBus: EventBus;
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
        </div>
      </>
    );
  }
}
