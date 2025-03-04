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
import { ModalHeader } from "./ModalHeader";
import { UnitSystem } from "./utils/UnitHelpers";

interface Props {
  unitSystem: UnitSystem;
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
        </div>
      </>
    );
  }
}
