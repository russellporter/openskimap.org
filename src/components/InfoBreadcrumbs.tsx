import { Breadcrumbs, Link, makeStyles, Typography } from "@material-ui/core";
import { country_reverse_geocoding } from "country-reverse-geocoding";
import { FeatureType, SkiAreaFeature } from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";
import { shortenedSkiAreaName } from "./Formatters";
import { FullLiftFeature, FullRunFeature } from "./Model";
import { getFirstPoint } from "./utils/GeoJSON";

const useStyles = makeStyles(theme => ({
  breadcrumbs: {
    marginBottom: theme.spacing(0.5)
  },
  breadcrumb: {
    maxWidth: "250px",
    whiteSpace: "nowrap",
    display: "inline-block",
    textOverflow: "ellipsis",
    overflow: "hidden",
    verticalAlign: "bottom"
  }
}));

export type InfoBreadcrumbsProps = {
  feature: FullLiftFeature | FullRunFeature | SkiAreaFeature;
  eventBus: EventBus;
};

export const InfoBreadcrumbs: React.SFC<InfoBreadcrumbsProps> = props => {
  const classes = useStyles();
  const properties = props.feature.properties;
  const skiAreas =
    properties.type === FeatureType.Lift || properties.type === FeatureType.Run
      ? properties.skiAreaFeatures
      : [];
  const countryName = getCountryName(props.feature.geometry);

  if (skiAreas.length === 0 && countryName === null) {
    return null;
  }

  return (
    <>
      {
        <Breadcrumbs
          classes={{ root: classes.breadcrumbs }}
          separator="›"
          aria-label="breadcrumb"
        >
          {countryName && (
            <Typography
              variant="inherit"
              classes={{ root: classes.breadcrumb }}
            >
              {countryName}
            </Typography>
          )}
          {skiAreas.length > 0 && (
            <span>
              {skiAreas
                .map(skiArea => (
                  <Link
                    classes={{ root: classes.breadcrumb }}
                    color="inherit"
                    key={"skiArea-" + skiArea.properties.id}
                    href={"#"}
                    onClick={() => {
                      props.eventBus.showInfo({
                        id: skiArea.properties.id,
                        panToPosition: null
                      });
                    }}
                  >
                    {shortenedSkiAreaName(skiArea.properties.name)}
                  </Link>
                ))
                .reduce(
                  (
                    accumulatedResult: React.ReactNode[],
                    skiArea,
                    index,
                    array
                  ) => {
                    accumulatedResult.push(skiArea);
                    if (index < array.length - 1) {
                      accumulatedResult.push(" / ");
                    }
                    return accumulatedResult;
                  },
                  []
                )}
            </span>
          )}
        </Breadcrumbs>
      }
    </>
  );
};

function getCountryName(geometry: GeoJSON.Geometry): string | null {
  const point = getFirstPoint(geometry);
  const country = country_reverse_geocoding().get_country(point[1], point[0]);
  if (country?.name !== undefined) {
    return country.name;
  } else {
    console.log(
      "Failed to get country " +
        JSON.stringify(country) +
        " for point " +
        JSON.stringify(point)
    );
    return null;
  }
}
