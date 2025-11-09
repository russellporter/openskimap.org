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
          High-resolution elevation data from multiple national and international providers. Data preparation and compilation by{" "}
          <Link href="https://techidiots.net/downloads/open-base-map-torrents/mbtiles/merged-terrainrgb" target="_blank">
            TechIdiots.net
          </Link>
          .
        </Typography>

        <Box component="ul" sx={{ pl: 2, m: 0, lineHeight: 1.6 }}>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Global:</strong>{" "}
            <Link href="https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/aw3d30_e.htm" target="_blank">
              JAXA AW3D30
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Europe:</strong>{" "}
            <Link href="https://sonny.4lima.de/" target="_blank">
              Sonny DTM
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>France:</strong>{" "}
            <Link href="https://geoservices.ign.fr/rgealti" target="_blank">
              IGN RGE Alti
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Italy:</strong> Tarquini S., I. Isola, M. Favalli, A. Battistini, G. Dotta (2023). TINITALY, a digital elevation model of Italy with a 10 meters cell size (Version 1.1). Istituto Nazionale di Geofisica e Vulcanologia (INGV).{" "}
            <Link href="https://doi.org/10.13127/tinitaly/1.1" target="_blank">
              https://doi.org/10.13127/tinitaly/1.1
            </Link>
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Italy (South Tyrol):</strong>{" "}
            <Link href="https://natur-raum.provinz.bz.it/de/digitale-hohenmodelle" target="_blank">
              Autonome Provinz Bozen - Südtirol
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Spain:</strong>{" "}
            <Link href="https://centrodedescargas.cnig.es/CentroDescargas/modelo-digital-terreno-mdt05-primera-cobertura" target="_blank">
              MDT05-cob1 2008-2015
            </Link>{" "}
            - CC BY 4.0{" "}
            <Link href="https://www.scne.es/" target="_blank">
              scne.es
            </Link>
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Switzerland:</strong>{" "}
            <Link href="https://www.swisstopo.admin.ch/fr/geodata/height/alti3d.html" target="_blank">
              SwissAlti3D
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Austria:</strong>{" "}
            <Link href="https://data.bev.gv.at/geonetwork/srv/api/records/5ce253fc-b7c5-4362-97af-6556c18a45d9" target="_blank">
              BEV Austria
            </Link>{" "}
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany:</strong> Data prepared by{" "}
            <Link href="https://www.opendem.info/opendtm_de.html" target="_blank">
              OpenDEM.info
            </Link>
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Thuringia):</strong> © GDI-Th{" "}
            <Link href="https://geoportal.thueringen.de/gdi-th/download-offene-geodaten" target="_blank">
              geoportal.thueringen.de
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Saxony-Anhalt):</strong> © 2024 Geodatenportal Sachsen-Anhalt{" "}
            <Link href="https://www.lvermgeo.sachsen-anhalt.de/" target="_blank">
              lvermgeo.sachsen-anhalt.de
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Lower Saxony):</strong> © GeoBasis-DE/LGLN 2024{" "}
            <Link href="https://www.lgln.niedersachsen.de/" target="_blank">
              lgln.niedersachsen.de
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Bavaria):</strong> © Bayerische Vermessungsverwaltung{" "}
            <Link href="https://www.geodaten.bayern.de/" target="_blank">
              geodaten.bayern.de
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Hesse):</strong> © Hessische Verwaltung für Bodenmanagement und Geoinformation{" "}
            <Link href="https://hvbg.hessen.de/" target="_blank">
              hvbg.hessen.de
            </Link>
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Saxony):</strong> © Landesamt für Geobasisinformation Sachsen{" "}
            <Link href="https://www.geosn.sachsen.de/" target="_blank">
              geosn.sachsen.de
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (North Rhine-Westphalia):</strong> © Geobasis NRW{" "}
            <Link href="https://www.bezreg-koeln.nrw.de/geobasis-nrw" target="_blank">
              bezreg-koeln.nrw.de/geobasis-nrw
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Rhineland-Palatinate):</strong> © GeoBasis-DE / LVermGeoRP2024{" "}
            <Link href="https://www.lvermgeo.rlp.de/" target="_blank">
              lvermgeo.rlp.de
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Saarland):</strong> © GeoBasis DE/LVGL-SL (2024){" "}
            <Link href="https://www.saarland.de/lvgl/DE/home" target="_blank">
              saarland.de/lvgl
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Schleswig-Holstein):</strong> © GeoBasis-DE/LVermGeo SH{" "}
            <Link href="https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/LVERMGEOSH" target="_blank">
              schleswig-holstein.de/LVERMGEOSH
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Mecklenburg-Vorpommern):</strong> © GeoBasis-DE/M-V 2024{" "}
            <Link href="https://www.geoportal-mv.de/" target="_blank">
              geoportal-mv.de
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Brandenburg):</strong> © GeoBasis-DE/LGB{" "}
            <Link href="https://geobasis-bb.de/lgb/de/" target="_blank">
              geobasis-bb.de
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Hamburg):</strong> © Freie und Hansestadt Hamburg, LGV{" "}
            <Link href="https://www.hamburg.de/politik-und-verwaltung/behoerden/behoerde-fuer-stadtentwicklung-und-wohnen/aemter-und-landesbetrieb/landesbetrieb-geoinformation-und-vermessung" target="_blank">
              hamburg.de/LGV
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Bremen):</strong> © Landesamt GeoInformation Bremen{" "}
            <Link href="https://www.geo.bremen.de/" target="_blank">
              geo.bremen.de
            </Link>{" "}
            - CC BY 4.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Berlin):</strong> © Geoportal Berlin{" "}
            <Link href="https://www.berlin.de/sen/sbw/stadtdaten/geoportal/" target="_blank">
              berlin.de/geoportal
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
          <Typography component="li" sx={{ mb: 1 }}>
            <strong>Germany (Baden-Württemberg):</strong> © LGL{" "}
            <Link href="https://www.lgl-bw.de/" target="_blank">
              lgl-bw.de
            </Link>{" "}
            - Datenlizenz Deutschland – Namensnennung – Version 2.0
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
