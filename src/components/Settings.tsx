import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import * as React from "react";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import { UnitSystem } from "./utils/UnitHelpers";

interface Props {
  unitSystem: UnitSystem;
  eventBus: EventBus;
}

export default class Settings extends React.Component<Props> {
  render() {
    return (
      <>
        <InfoHeader onClose={() => this.props.eventBus.closeSettings()}>
          <Typography variant="h5" id="modal-title">
            Settings
          </Typography>
        </InfoHeader>

        <div style={{ width: 500, padding: "8px 8px" }}>
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
        </div>
      </>
    );
  }
}
