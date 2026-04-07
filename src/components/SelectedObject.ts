import { LiftFeature, RunFeature, SkiAreaFeature } from "openskidata-format";

export type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export type ObjectIDType = "openskimap" | "skimap_org" | "openstreetmap";

export interface PanConfig {
  animate: boolean;
}

export interface SelectedObject {
  id: string;
  idType: ObjectIDType;
  pan?: PanConfig;
  feature?: MapFeature;
  showInfo: boolean;
}
