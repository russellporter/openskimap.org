import { Dialog } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import EventBus from "./EventBus";
import Settings from "./Settings";
import { UnitSystem } from "./utils/UnitHelpers";

export const SettingsModal: React.FunctionComponent<{
  open: boolean;
  unitSystem: UnitSystem;
  eventBus: EventBus;
}> = (props) => {
  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeSettings();
      }}
    >
      <Box sx={{ p: 4 }}>
        <Settings eventBus={props.eventBus} unitSystem={props.unitSystem} />
      </Box>
    </Dialog>
  );
};
