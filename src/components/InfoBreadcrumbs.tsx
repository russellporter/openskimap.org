import { Breadcrumbs, Link, makeStyles } from "@material-ui/core";
import {
  FeatureType,
  LiftFeature,
  LiftProperties,
  Location,
  RunFeature,
  RunProperties,
  SkiAreaFeature,
  SkiAreaProperties,
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";

const useStyles = makeStyles((theme) => ({
  breadcrumbs: {
    marginBottom: theme.spacing(0.5),
  },
  breadcrumb: {
    maxWidth: "250px",
    whiteSpace: "nowrap",
    display: "inline-block",
    textOverflow: "ellipsis",
    overflow: "hidden",
    verticalAlign: "bottom",
  },
}));

export type InfoBreadcrumbsProps = {
  feature: LiftFeature | RunFeature | SkiAreaFeature;
  eventBus: EventBus;
};

export const InfoBreadcrumbs: React.SFC<InfoBreadcrumbsProps> = (props) => {
  const classes = useStyles();
  const properties = props.feature.properties;
  const breadcrumbs = getBreadcrumbs(properties, props.eventBus);

  if (breadcrumbs.length === 0) {
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
          {breadcrumbs.map((breadcrumbsGroup) => (
            <span>
              {breadcrumbsGroup
                .map((breadcrumb) => {
                  if (breadcrumb.onClick) {
                    return (
                      <Link
                        classes={{ root: classes.breadcrumb }}
                        color="inherit"
                        key={breadcrumb.id}
                        href={"#"}
                        onClick={breadcrumb.onClick}
                      >
                        {breadcrumb.text}
                      </Link>
                    );
                  } else {
                    return (
                      <span
                        className={classes.breadcrumb}
                        color="inherit"
                        key={breadcrumb.id}
                      >
                        {breadcrumb.text}
                      </span>
                    );
                  }
                })
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
          ))}
        </Breadcrumbs>
      }
    </>
  );
};

type Breadcrumb = {
  id: string;
  text: string;
  onClick?: () => void;
};

function getBreadcrumbs(
  properties: SkiAreaProperties | LiftProperties | RunProperties,
  eventBus: EventBus
): Breadcrumb[][] {
  let skiAreas: SkiAreaFeature[] = [];
  if (
    properties.type === FeatureType.Lift ||
    properties.type === FeatureType.Run
  ) {
    skiAreas = properties.skiAreas;
  }

  let locations: Location[];
  if (properties.location) {
    locations = [properties.location];
  } else {
    locations = skiAreas.flatMap((skiArea) =>
      skiArea.properties.location ? [skiArea.properties.location] : []
    );
  }

  const countryBreadcrumbs: Breadcrumb[] = unique(
    locations.flatMap((location) => {
      if (!location) {
        return [];
      }
      return [
        {
          id: "country-" + location.iso3166_1Alpha2,
          text: location.localized.en.country,
        },
      ];
    })
  );

  const regionBreadcrumbs: Breadcrumb[] = unique(
    locations.flatMap((location) => {
      const regionName = location?.localized.en.region;
      const regionCode = location?.iso3166_2;
      if (!regionName || !regionCode) {
        return [];
      }

      return [
        {
          id: "region-" + regionCode,
          text: regionName,
        },
      ];
    })
  );

  const skiAreaBreadcrumbs: Breadcrumb[] = unique(
    skiAreas.flatMap((skiArea) => {
      return [
        {
          id: "skiArea-" + skiArea.properties.id,
          text: skiArea.properties.name ?? "Ski Area",
          onClick: () => {
            eventBus.showInfo({
              id: skiArea.properties.id,
              panToPosition: null,
            });
          },
        },
      ];
    })
  );

  return [countryBreadcrumbs, regionBreadcrumbs, skiAreaBreadcrumbs].filter(
    (group) => group.length > 0
  );
}

function unique<T extends { id: string }>(input: T[]): T[] {
  const ids = new Set();
  return input.filter((item) => {
    if (ids.has(item.id)) {
      return false;
    }
    ids.add(item.id);
    return true;
  });
}
