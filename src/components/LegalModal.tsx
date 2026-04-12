import { Dialog, Link, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import EventBus from "./EventBus";
import { ModalHeader } from "./ModalHeader";

export const LegalModal: React.FunctionComponent<{
  open: boolean;
  eventBus: EventBus;
}> = (props) => {
  return (
    <Dialog
      open={props.open}
      onClose={() => {
        props.eventBus.closeLegal();
      }}
    >
      <Box sx={{ p: 4 }}>
        <ModalHeader
          onClose={() => {
            props.eventBus.closeLegal();
          }}
        >
          <Typography variant="h5">Credits & Legal</Typography>
        </ModalHeader>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Map Data
        </Typography>
        <Typography paragraph sx={{ mb: 2 }}>
          <Link href="https://www.openstreetmap.org/copyright" target="_blank">
            © OpenStreetMap contributors
          </Link>{" "}
          and <Link href="https://openskimap.org/?about">OpenSkiMap.org</Link>.
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Place Data
        </Typography>
        <Typography paragraph sx={{ mb: 2 }}>
          Data from{" "}
          <Link href="https://whosonfirst.org/" target="_blank">
            Who's On First
          </Link>
          .{" "}
          <Link href="https://whosonfirst.org/docs/licenses/" target="_blank">
            License
          </Link>
          .
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Base Map
        </Typography>
        <Typography paragraph sx={{ mb: 2 }}>
          Graciously provided by{" "}
          <Link href="https://openfreemap.org/" target="_blank">
            OpenFreeMap
          </Link>{" "}
          and{" "}
          <Link href="https://www.openmaptiles.org/" target="_blank">
            © OpenMapTiles
          </Link>
          .
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Satellite Imagery
        </Typography>
        <Typography paragraph sx={{ mb: 2 }}>
          Powered by{" "}
          <Link href="https://www.esri.com/" target="_blank">
            Esri
          </Link>
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>
          Terrain Data
        </Typography>
        <Typography paragraph sx={{ mb: 3 }}>
          <Link href="https://mapterhorn.com/attribution" target="_blank">
            © Mapterhorn
          </Link>
        </Typography>
      </Box>
    </Dialog>
  );
};
