import {
  FeatureType,
  getLiftNameAndType,
  RunProperties,
  SkiAreaFeature,
} from "openskidata-format";
import {
  formattedDifficultyName,
  formattedRunUse,
  shortenedSkiAreaName,
} from "../Formatters";
import { FullLiftFeature, FullRunFeature } from "../Model";

const metaDescriptionElement = getMetaDescription();
const originalMetaDescription = metaDescriptionElement.getAttribute("content")!;

export function updatePageMetadata(
  feature: SkiAreaFeature | FullLiftFeature | FullRunFeature | null
) {
  const name = feature !== null ? getDetailedTitle(feature) : null;
  if (name !== null && name.length > 0) {
    document.title = name + " - OpenSkiMap.org";
    metaDescriptionElement.setAttribute(
      "content",
      `Explore a ski trail map of ${name} and learn more about the ski area.`
    );
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

function skiAreaNames(skiAreas: SkiAreaFeature[]): string | null {
  const names = skiAreas
    .flatMap((skiArea) => {
      const name = skiArea.properties.name;
      return name !== null ? [shortenedSkiAreaName(name)] : [];
    })
    .join(", ");

  return names.length > 0 ? names : null;
}

function getDetailedTitle(
  feature: SkiAreaFeature | FullLiftFeature | FullRunFeature
): string | null {
  const properties = feature.properties;
  switch (properties.type) {
    case FeatureType.Lift:
      return nullableToArray(getLiftNameAndType(properties))
        .concat(nullableToArray(skiAreaNames(properties.skiAreaFeatures)))
        .join(" - ");
    case FeatureType.Run:
      return [getRunTitleAndSubtitle(properties).title]
        .concat(nullableToArray(skiAreaNames(properties.skiAreaFeatures)))
        .join(" - ");
    case FeatureType.SkiArea:
      return properties.name;
  }
}

export function getRunTitleAndSubtitle(
  properties: RunProperties
): { title: string; subtitle: string | null } {
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
