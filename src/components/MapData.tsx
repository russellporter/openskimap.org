export enum Status {
  Proposed = 'proposed',
  Planned = 'planned',
  Construction = 'construction',
  Operating = 'operating',
  Disused = 'disused',
  Abandoned = 'abandoned',
}

export interface SkiWayData {
  'lid': string;
  'name'?: string;
  'ref'?: string;
  'color': string;
  'note'?: string;
}

export interface SkiLiftData extends SkiWayData {
  'name_and_type'?: string;
  'aerialway'?: string;
  'oneway'?: string;
  'foot'?: string;
  'access'?: string;
  'status'?: Status;
  'aerialway:occupancy'?: string;
  'aerialway:capacity'?: string;
  'aerialway:duration'?: string;
  'aerialway:bubble'?: string;
  'aerialway:heating'?: string;
  'aerialway:bicycle'?: string;
  'aerialway:access'?: string;
  'aerialway:winter:access'?: string;
  'aerialway:summer:access'?: string;
}

export interface SkiRunData extends SkiWayData {
  'piste:type': string;
  'oneway': string;
  'piste:difficulty'?: string;
  'piste:grooming'?: string;
  'piste:grooming:priority'?: string;
  'piste:status'?: string;
  'gladed'?: string;
  'patrolled'?: string;
  'lit'?: string;
  'route'?: string;
  'area'?: string;
}

export interface SkiAreaData {
  'id': string;
  'name': string;
  'operating_status': string;
}
