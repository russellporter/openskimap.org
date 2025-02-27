import {
  FormControlLabel,
  FormGroup,
  FormLabel,
  Slider,
  Typography,
} from "@mui/material";
import { SkiAreaActivity } from "openskidata-format";
import * as React from "react";
import MapFilters from "../MapFilters";
import { CardHeader } from "./CardHeader";
import { DownhillCheckbox, NordicCheckbox } from "./Checkbox";
import EventBus from "./EventBus";
import { ScrollableCard } from "./ScrollableCard";
import * as UnitHelpers from "./utils/UnitHelpers";

export const FilterForm: React.FunctionComponent<{
  eventBus: EventBus;
  filters: MapFilters;
  width: number;
  visibleSkiAreasCount: number;
  unitSystem: UnitHelpers.UnitSystem;
}> = (props) => {
  const isDownhillEnabled = !props.filters.hiddenActivities.includes(
    SkiAreaActivity.Downhill
  );
  const isNordicEnabled = !props.filters.hiddenActivities.includes(
    SkiAreaActivity.Nordic
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
    <ScrollableCard
      width={props.width}
      header={
        <CardHeader onClose={() => props.eventBus.hideFilters()}>
          <Typography gutterBottom variant="h6">
            Filters
          </Typography>
        </CardHeader>
      }
    >
      <div style={formSectionStyle}>
        <FormLabel component="legend">Activities</FormLabel>
        <FormGroup>
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
    </ScrollableCard>
  );
};
