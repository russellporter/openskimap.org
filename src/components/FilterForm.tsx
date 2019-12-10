import {
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Typography
} from "@material-ui/core";
import { Activity } from "openskidata-format";
import * as React from "react";
import MapFilters from "../MapFilters";
import EventBus from "./EventBus";

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

  return (
    <Card style={{ width: props.width }}>
      <CardContent>
        <Typography gutterBottom variant="h6">
          Filters
        </Typography>
        <FormControl component="fieldset">
          <FormLabel component="legend">Activities</FormLabel>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  color="default"
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
                <Checkbox
                  color="default"
                  checked={isNordicEnabled}
                  onChange={() =>
                    props.eventBus.toggleActivity(Activity.Nordic)
                  }
                />
              }
              label="Nordic"
            />
          </FormGroup>
        </FormControl>
      </CardContent>
    </Card>
  );
};
