export enum Status {
  Proposed = "proposed",
  Planned = "planned",
  Construction = "construction",
  Operating = "operating",
  Disused = "disused",
  Abandoned = "abandoned"
}

export enum FeatureType {
  Run = "run",
  Lift = "lift",
  SkiArea = "skiArea"
}

export enum Activity {
  Downhill = "downhill",
  Nordic = "nordic",
  Backcountry = "backcountry"
}

export interface SkiWayData {
  lid: string;
  name?: string;
  ref?: string;
  color: string;
  note?: string;
}

export interface SkiLiftData extends SkiWayData {
  type: FeatureType.Lift;
  name_and_type?: string;
  aerialway?: string;
  oneway?: string;
  foot?: string;
  access?: string;
  status?: Status;
  "aerialway:occupancy"?: string;
  "aerialway:capacity"?: string;
  "aerialway:duration"?: string;
  "aerialway:bubble"?: string;
  "aerialway:heating"?: string;
  "aerialway:bicycle"?: string;
  "aerialway:access"?: string;
  "aerialway:winter:access"?: string;
  "aerialway:summer:access"?: string;
}

export interface SkiRunData extends SkiWayData {
  type: FeatureType.Run;
  "piste:type": string;
  oneway: string;
  "piste:difficulty"?: string;
  "piste:grooming"?: string;
  "piste:grooming:priority"?: string;
  "piste:status"?: string;
  gladed?: string;
  patrolled?: string;
  lit?: string;
  route?: string;
  area?: string;
}

export interface SkiAreaData {
  type: FeatureType.SkiArea;
  id?: string;
  lid: string;
  name: string;
  status: Status | null;
  activities: Activity[];
  generated: boolean;
}
