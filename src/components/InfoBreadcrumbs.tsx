import { Breadcrumbs, Link } from "@mui/material";
import { styled } from "@mui/system";
import {
  FeatureType,
  LiftFeature,
  LiftProperties,
  Place,
  RunFeature,
  RunProperties,
  SkiAreaFeature,
  SkiAreaProperties,
  SkiAreaSummaryFeature,
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";

const StyledBreadcrumb = styled("span")({
  maxWidth: "250px",
  whiteSpace: "nowrap",
  display: "inline-block",
  textOverflow: "ellipsis",
  overflow: "hidden",
  verticalAlign: "bottom",
});

export type InfoBreadcrumbsProps = {
  feature: LiftFeature | RunFeature | SkiAreaFeature;
  eventBus: EventBus;
};

export const InfoBreadcrumbs: React.FunctionComponent<InfoBreadcrumbsProps> = (
  props
) => {
  const properties = props.feature.properties;
  const breadcrumbs = getBreadcrumbs(properties, props.eventBus);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <>
      {
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs.map((breadcrumbsGroup, groupIndex) => (
            <span key={groupIndex}>
              {breadcrumbsGroup
                .map((breadcrumb) => {
                  if (breadcrumb.onClick) {
                    return (
                      <StyledBreadcrumb key={breadcrumb.id}>
                        <Link
                          color="inherit"
                          href={"#"}
                          onClick={breadcrumb.onClick}
                        >
                          {breadcrumb.text}
                        </Link>
                      </StyledBreadcrumb>
                    );
                  } else {
                    return (
                      <StyledBreadcrumb color="inherit" key={breadcrumb.id}>
                        {breadcrumb.text}
                      </StyledBreadcrumb>
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
  let skiAreas: SkiAreaSummaryFeature[] = [];
  if (
    properties.type === FeatureType.Lift ||
    properties.type === FeatureType.Run
  ) {
    skiAreas = properties.skiAreas;
  }

  let places = properties.places;

  // Group places by country
  const placesByCountry = new Map<string, Place[]>();
  places.forEach((place) => {
    const countryCode = place.iso3166_1Alpha2;
    if (!placesByCountry.has(countryCode)) {
      placesByCountry.set(countryCode, []);
    }
    placesByCountry.get(countryCode)!.push(place);
  });

  // Create country breadcrumbs
  const countryBreadcrumbs: Breadcrumb[] = Array.from(placesByCountry.keys())
    .sort()
    .map((countryCode) => {
      const place = placesByCountry.get(countryCode)![0];
      return {
        id: "country-" + countryCode,
        text: place.localized.en.country,
      };
    });

  // Create region breadcrumbs grouped by country
  const regionBreadcrumbs: Breadcrumb[] = [];
  Array.from(placesByCountry.values()).forEach((countryPlaces) => {
    const regions = unique(
      countryPlaces
        .filter((place) => place.localized.en.region && place.iso3166_2)
        .map((place) => ({
          id: "region-" + place.iso3166_2!,
          text: place.localized.en.region!,
        }))
    );
    regionBreadcrumbs.push(...regions);
  });
  regionBreadcrumbs.sort((a, b) => a.text.localeCompare(b.text));

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
