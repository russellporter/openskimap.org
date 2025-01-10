import {
  Card,
  CardContent,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Slider,
  Typography,
} from "@mui/material";
import { Activity } from "openskidata-format";
import * as React from "react";
import MapFilters from "../MapFilters";
import { DownhillCheckbox, NordicCheckbox } from "./Checkbox";
import EventBus from "./EventBus";
import { InfoHeader } from "./InfoHeader";
import * as UnitHelpers from "./utils/UnitHelpers";

export const FilterForm: React.FunctionComponent<{
  eventBus: EventBus;
  filters: MapFilters;
  width: number;
  visibleSkiAreasCount: number;
  unitSystem: UnitHelpers.UnitSystem;
}> = (props) => {
  const isDownhillEnabled = !props.filters.hiddenActivities.includes(
    Activity.Downhill
  );
  const isNordicEnabled = !props.filters.hiddenActivities.includes(
    Activity.Nordic
  );

  const sliderMargins = { marginLeft: "8px", marginRight: "8px" };
  const formSectionStyle = { marginBottom: "16px" };
  const initialMinElevationValue = React.useState(
    props.filters.minElevation || 0
  )[0];
  const initialMinVerticalValue = React.useState(
    props.filters.minVertical || 0
  )[0];
  const initialMinRunLengthValue = React.useState(
    props.filters.minRunLength || 0
  )[0];

  return (
    <Card style={{ width: props.width }}>
      <CardContent>
        <InfoHeader onClose={() => props.eventBus.hideFilters()}>
          <Typography gutterBottom variant="h6">
            Filters
          </Typography>
        </InfoHeader>
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
          <FormLabel component="legend">
            Minimum Elevation (
            {UnitHelpers.labelForLengthUnit(
              UnitHelpers.closestEquivalent("meters", props.unitSystem)
            )}
            )
          </FormLabel>
          <FormGroup style={sliderMargins}>
            <Slider
              defaultValue={initialMinElevationValue}
              min={0}
              max={5000}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) =>
                UnitHelpers.heightText(value, props.unitSystem, true)
              }
              onChange={(_, value) =>
                props.eventBus.setMinimumElevation(value as number)
              }
            />
          </FormGroup>
        </div>
        <div style={formSectionStyle}>
          <FormLabel component="legend">
            Minimum Vertical (
            {UnitHelpers.labelForLengthUnit(
              UnitHelpers.closestEquivalent("meters", props.unitSystem)
            )}
            )
          </FormLabel>
          <FormGroup style={sliderMargins}>
            <Slider
              defaultValue={initialMinVerticalValue}
              min={0}
              max={2000}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) =>
                UnitHelpers.heightText(value, props.unitSystem, true)
              }
              onChange={(_, value) =>
                props.eventBus.setMinimumVertical(value as number)
              }
            />
          </FormGroup>
        </div>
        <div style={formSectionStyle}>
          <FormLabel component="legend">
            Run Length (
            {UnitHelpers.labelForLengthUnit(
              UnitHelpers.closestEquivalent("kilometers", props.unitSystem)
            )}
            )
          </FormLabel>
          <FormGroup style={sliderMargins}>
            <Slider
              defaultValue={initialMinRunLengthValue}
              min={0}
              max={500}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) =>
                UnitHelpers.distanceText({
                  distanceInMeters: value * 1000,
                  unitSystem: props.unitSystem,
                  forceLongestUnit: true,
                  withSpace: true,
                  roundToNearestDecimal: true,
                })
              }
              onChange={(_, value) =>
                props.eventBus.setMinimumRunLength(value as number)
              }
            />
          </FormGroup>
        </div>
        <Typography variant="subtitle2">
          {props.visibleSkiAreasCount} visible ski areas
        </Typography>
      </CardContent>
    </Card>
  );
};
