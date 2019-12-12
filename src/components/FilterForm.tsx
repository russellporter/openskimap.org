import {
  Card,
  CardContent,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MuiThemeProvider,
  Slider,
  Typography
} from "@material-ui/core";
import { Activity } from "openskidata-format";
import * as React from "react";
import MapFilters from "../MapFilters";
import { DownhillCheckbox, NordicCheckbox } from "./Checkbox";
import EventBus from "./EventBus";
import { theme } from "./Theme";
import ValueLabel from "./ValueLabel";

export const FilterForm: React.FunctionComponent<{
  eventBus: EventBus;
  filters: MapFilters;
  width: number;
}> = props => {
  const isDownhillEnabled = !props.filters.hiddenActivities.includes(
    Activity.Downhill
  );
  const isNordicEnabled = !props.filters.hiddenActivities.includes(
    Activity.Nordic
  );

  const sliderMargins = { marginLeft: "8px", marginRight: "8px" };
  const formSectionStyle = { marginBottom: "16px" };
  const lastFormSectionStyle = {};

  return (
    <MuiThemeProvider theme={theme}>
      <Card style={{ width: props.width }}>
        <CardContent>
          <Typography gutterBottom variant="h6">
            Filters
          </Typography>
          <div style={formSectionStyle}>
            <FormLabel component="legend">Activities</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <DownhillCheckbox
                    checked={isDownhillEnabled}
                    onChange={() =>
                      props.eventBus.toggleActivity(Activity.Downhill)
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
                      props.eventBus.toggleActivity(Activity.Nordic)
                    }
                  />
                }
                label="Nordic"
              />
            </FormGroup>
          </div>
          <div style={formSectionStyle}>
            <FormLabel component="legend">Minimum Elevation (m)</FormLabel>
            <FormGroup style={sliderMargins}>
              <Slider
                defaultValue={props.filters.minElevation || 0}
                min={0}
                max={5000}
                valueLabelDisplay="auto"
                valueLabelFormat={value => value + " m"}
                ValueLabelComponent={ValueLabel}
                onChange={(_, value) =>
                  props.eventBus.setMinimumElevation(value as number)
                }
              />
            </FormGroup>
          </div>
          <div style={formSectionStyle}>
            <FormLabel component="legend">Minimum Vertical (m)</FormLabel>
            <FormGroup style={sliderMargins}>
              <Slider
                defaultValue={props.filters.minVertical || 0}
                min={0}
                max={2000}
                valueLabelDisplay="auto"
                valueLabelFormat={value => value + " m"}
                ValueLabelComponent={ValueLabel}
                onChange={(_, value) =>
                  props.eventBus.setMinimumVertical(value as number)
                }
              />
            </FormGroup>
          </div>
          <div style={lastFormSectionStyle}>
            <FormLabel component="legend">Run Length (km)</FormLabel>
            <FormGroup style={sliderMargins}>
              <Slider
                defaultValue={props.filters.minRunLength || 0}
                min={0}
                max={500}
                valueLabelDisplay="auto"
                valueLabelFormat={value => value + " km"}
                ValueLabelComponent={ValueLabel}
                onChange={(_, value) =>
                  props.eventBus.setMinimumRunLength(value as number)
                }
              />
            </FormGroup>
          </div>
        </CardContent>
      </Card>
    </MuiThemeProvider>
  );
};
