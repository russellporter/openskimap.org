import {
  SkiPass,
  SkiPassBrand,
  SkiPassCatalog,
  SkiPassID,
} from "openskidata-format";
import { TILES_BASE_URL } from "./Config";

/** An actual purchasable pass ID, shared by URLs, local storage, and vector tiles. */
export type SkiPassFilterKey = SkiPassID;

export interface SkiPassGroup {
  brand: SkiPassBrand;
  passes: SkiPass[];
}

/** Reads a comma-separated ski pass selection from the URL or local storage. */
export function parseSkiPassSelection(value: string): SkiPassFilterKey[] {
  return value
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

/** Separates branded pass families from standalone products. */
export function groupSkiPasses(catalog: SkiPassCatalog): {
  groups: SkiPassGroup[];
  standalone: SkiPass[];
} {
  const groups = catalog.brands
    .map((brand) => ({
      brand,
      passes: catalog.passes
        .filter((pass) => pass.brandID === brand.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter((group) => group.passes.length > 0)
    .sort((left, right) => left.brand.name.localeCompare(right.brand.name));
  const standalone = catalog.passes
    .filter((pass) => pass.brandID === null)
    .sort((left, right) => left.name.localeCompare(right.name));
  return { groups, standalone };
}

/** Add or remove one actual pass without changing any sibling passes in its brand. */
export function toggleSkiPassSelection(
  key: SkiPassFilterKey,
  checked: boolean,
  selected: SkiPassFilterKey[],
): SkiPassFilterKey[] {
  if (checked) {
    return selected.includes(key) ? selected : [...selected, key];
  }
  return selected.filter((existing) => existing !== key);
}

let cachedSkiPassCatalog: Promise<SkiPassCatalog> | null = null;

/** Loads the static pass catalogue at most once per page load. */
export function loadSkiPassCatalog(): Promise<SkiPassCatalog> {
  if (cachedSkiPassCatalog === null) {
    cachedSkiPassCatalog = fetch(`${TILES_BASE_URL}/ski_passes.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed loading ski passes: ${response.status}`);
        }
        return response.json();
      })
      .then((catalog: SkiPassCatalog) => catalog)
      .catch((error) => {
        cachedSkiPassCatalog = null;
        throw error;
      });
  }
  return cachedSkiPassCatalog;
}

/** Names of selected actual passes, for the Layers modal summary. */
export function selectedSkiPassNames(
  passes: SkiPass[],
  selected: SkiPassFilterKey[],
): string[] {
  const namesByID = new Map(passes.map((pass) => [pass.id, pass.name]));
  return selected.map((key) => namesByID.get(key) ?? key);
}
