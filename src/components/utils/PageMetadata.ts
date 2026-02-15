import {
  FeatureType,
  getLiftNameAndType,
  LiftFeature,
  RunFeature,
  RunProperties,
  SkiAreaFeature,
  SkiAreaSummaryFeature,
} from "openskidata-format";
import {
  formattedDifficultyName,
  formattedRunUse,
  shortenedSkiAreaName,
} from "../Formatters";

const metaDescriptionElement = getMetaDescription();
const originalMetaDescription = metaDescriptionElement.getAttribute("content")!;

export function updatePageMetadata(
  feature: SkiAreaFeature | LiftFeature | RunFeature | null
) {
  const name = feature !== null ? getDetailedTitle(feature) : null;
  if (name !== null && name.length > 0) {
    document.title = name + " - OpenSkiMap.org";
    const locationText = feature !== null ? getLocationText(feature) : null;
    const description = locationText
      ? `Explore a ski trail map of ${name} ${locationText} and learn more about the ski area.`
      : `Explore a ski trail map of ${name} and learn more about the ski area.`;
    metaDescriptionElement.setAttribute("content", description);
  } else {
    document.title = "OpenSkiMap.org";
    metaDescriptionElement.setAttribute("content", originalMetaDescription);
  }
}

function getMetaDescription(): HTMLMetaElement {
  const metas = Array.from(document.getElementsByTagName("meta"));

  return metas.find((meta) => meta.getAttribute("name") === "description")!;
}

function nullableToArray<T>(object: T | null): T[] {
  return object === null ? [] : [object];
}

function skiAreaNames(skiAreas: SkiAreaSummaryFeature[]): string | null {
  const names = skiAreas
    .flatMap((skiArea) => {
      const name = skiArea.properties.name;
      return name !== null ? [shortenedSkiAreaName(name)] : [];
    })
    .join(", ");

  return names.length > 0 ? names : null;
}

function getLocationText(
  feature: SkiAreaFeature | LiftFeature | RunFeature
): string | null {
  const places = feature.properties.places;
  if (!places || places.length === 0) {
    return null;
  }

  // Extract unique localities and countries
  const localities = Array.from(
    new Set(
      places
        .map((place) => place.localized.en.locality)
        .filter((locality): locality is string => locality !== null)
    )
  );

  const countries = Array.from(
    new Set(places.map((place) => place.localized.en.country))
  );

  if (localities.length === 0 && countries.length === 0) {
    return null;
  }

  const locationParts: string[] = [];

  // Add localities if present
  if (localities.length > 0) {
    locationParts.push(localities.join(" / "));
  }

  // Add countries if present
  if (countries.length > 0) {
    locationParts.push(countries.join(" / "));
  }

  return "near " + locationParts.join(", ");
}

function getDetailedTitle(
  feature: SkiAreaFeature | LiftFeature | RunFeature
): string | null {
  const properties = feature.properties;
  switch (properties.type) {
    case FeatureType.Lift:
      return nullableToArray(getLiftNameAndType(properties))
        .concat(nullableToArray(skiAreaNames(properties.skiAreas)))
        .join(" at ");
    case FeatureType.Run:
      return [getRunTitleAndSubtitle(properties).title]
        .concat(nullableToArray(skiAreaNames(properties.skiAreas)))
        .join(" at ");
    case FeatureType.SkiArea:
      return properties.name;
  }
}

export function getRunTitleAndSubtitle(properties: RunProperties): {
  title: string;
  subtitle: string | null;
} {
  const summary = getRunSummary(properties);
  if (properties.name) {
    return { title: properties.name, subtitle: summary };
  } else {
    return { title: summary, subtitle: null };
  }
}

function getRunSummary(data: RunProperties) {
  const difficulty = data.difficulty
    ? formattedDifficultyName(data.difficulty)
    : null;
  const type = formattedRunUse(data.uses, data.grooming);
  if (difficulty && type) {
    return difficulty + " " + type.toLowerCase();
  } else if (difficulty) {
    return difficulty;
  } else {
    return type;
  }
}
