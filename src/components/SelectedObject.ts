import { LiftFeature, RunFeature, SkiAreaFeature } from "openskidata-format";

export type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export interface PanConfig {
  animate: boolean;
}

export interface SelectedObject {
  id: string;
  pan?: PanConfig;
  feature?: MapFeature;
  showInfo: boolean;
}
