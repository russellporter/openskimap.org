import { LiftFeature, RunFeature, SkiAreaFeature } from "openskidata-format";

export type MapFeature = RunFeature | LiftFeature | SkiAreaFeature;

export interface PanConfig {
  animate: boolean;
}

export interface InfoData {
  id: string;
  pan?: PanConfig;
  feature?: MapFeature;
}
