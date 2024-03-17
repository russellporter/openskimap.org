import { Dialog } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import About from "./About";
import EventBus from "./EventBus";

export const AboutModal: React.FunctionComponent<{
  open: boolean;
  eventBus: EventBus;
}> = (props) => {
  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeAboutInfo();
      }}
    >
      <Box sx={{ p: 4 }}>
        <About eventBus={props.eventBus} />
      </Box>
    </Dialog>
  );
};
