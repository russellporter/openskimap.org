import {
  LiftFeature,
  LiftProperties,
  RunFeature,
  RunProperties,
  SkiAreaFeature,
} from "openskidata-format";

export interface FullRunProperties extends RunProperties {
  skiAreaFeatures: SkiAreaFeature[];
}

export interface FullRunFeature extends RunFeature {
  properties: FullRunProperties;
}

export interface FullLiftProperties extends LiftProperties {
  skiAreaFeatures: SkiAreaFeature[];
}

export interface FullLiftFeature extends LiftFeature {
  properties: FullLiftProperties;
}
