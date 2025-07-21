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
          Courtesy of{" "}
          <Link
            href="https://registry.opendata.aws/terrain-tiles/"
            target="_blank"
          >
            Mapzen and AWS Open Data
          </Link>
          .
        </Typography>

        <Box component="ul" sx={{ pl: 2, m: 0, lineHeight: 1.6 }}>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>ArcticDEM:</strong> Terrain data DEM(s) were created from
            DigitalGlobe, Inc., imagery and funded under National Science
            Foundation awards 1043681, 1559691, and 1542736
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Australia:</strong> © Commonwealth of Australia (Geoscience
            Australia) 2017
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Austria:</strong> © offene Daten Österreichs – Digitales
            Geländemodell (DGM) Österreich
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Canada:</strong> Contains information licensed under the
            Open Government Licence – Canada
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Europe:</strong> Produced using Copernicus data and
            information funded by the European Union - EU-DEM layers
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Global ETOPO1:</strong> U.S. National Oceanic and
            Atmospheric Administration
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Mexico:</strong> INEGI, Continental relief, 2016
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>New Zealand:</strong> Copyright 2011 Crown copyright (c)
            Land Information New Zealand and the New Zealand Government (All
            rights reserved)
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Norway:</strong> © Kartverket
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>United Kingdom:</strong> © Environment Agency copyright
            and/or database right 2015. All rights reserved
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>United States:</strong> 3DEP (formerly NED) and global
            GMTED2010 and SRTM terrain data courtesy of the U.S. Geological
            Survey
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
