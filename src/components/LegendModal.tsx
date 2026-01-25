import { Dialog } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import EventBus from "./EventBus";
import { Legend } from "./Legend";

export const LegendModal: React.FunctionComponent<{
  open: boolean;
  eventBus: EventBus;
  mapCenter?: { lng: number; lat: number };
  section?: string | null;
}> = (props) => {
  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeLegend();
      }}
      maxWidth="md"
    >
      <Box sx={{ p: 4 }}>
        <Legend
          mapCenter={props.mapCenter}
          onClose={() => props.eventBus.closeLegend()}
          section={props.section}
        />
      </Box>
    </Dialog>
  );
};
