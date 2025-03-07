export type UnitSystem = "metric" | "imperial";

type MetricLengthUnit = "meters" | "kilometers";

type LengthUnit = MetricLengthUnit | "feet" | "miles";
type LengthWithUnit = {
  length: number;
  lengthUnit: LengthUnit;
};

export function unitSystemFromString(unitSystem: string | null): UnitSystem {
  switch (unitSystem) {
    case "imperial":
    case "metric":
      return unitSystem;
    default:
      return "metric";
  }
}

export function closestEquivalent(
  unit: MetricLengthUnit,
  unitSystem: UnitSystem
): LengthUnit {
  switch (unitSystem) {
    case "metric":
      switch (unit) {
        case "meters":
          return "meters";
        case "kilometers":
          return "kilometers";
      }
    case "imperial":
      switch (unit) {
        case "meters":
          return "feet";
        case "kilometers":
          return "miles";
      }
  }
}

export function labelForLengthUnit(unit: LengthUnit) {
  switch (unit) {
    case "feet":
      return `ft`;
    case "meters":
      return `m`;
    case "kilometers":
      return `km`;
    case "miles":
      return `mi`;
  }
}

function formattedLengthString(
  lengthWithUnit: LengthWithUnit,
  withSpace: boolean
) {
  const unit = lengthWithUnit.lengthUnit;
  const valuePrefix = `${lengthWithUnit.length}${withSpace ? " " : ""}`;

  return `${valuePrefix}${labelForLengthUnit(unit)}`;
}

function convertDistance(
  lengthInMeters: number,
  unit: LengthUnit,
  roundToNearestDecimal = false
): LengthWithUnit {
  let lengthInUnit;

  const decimals = roundToNearestDecimal ? 0 : 2;
  const decimalFactor = 10 ** decimals;

  switch (unit) {
    case "feet":
      lengthInUnit = Math.round(lengthInMeters * 3.28084);
      break;
    case "meters":
      lengthInUnit = Math.round(lengthInMeters * 1);
      break;
    case "kilometers":
      lengthInUnit =
        Math.round(lengthInMeters * 0.001 * decimalFactor) / decimalFactor;
      break;
    case "miles":
      lengthInUnit =
        Math.round(lengthInMeters * 0.000621371 * decimalFactor) /
        decimalFactor;
      break;
  }

  return { length: lengthInUnit, lengthUnit: unit };
}

export function heightText(
  heightInMeters: number,
  unitSystem: UnitSystem,
  withSpace = false
) {
  switch (unitSystem) {
    case "metric":
      return formattedLengthString(
        convertDistance(heightInMeters, "meters"),
        withSpace
      );
    case "imperial":
      return formattedLengthString(
        convertDistance(heightInMeters, "feet"),
        withSpace
      );
  }
}

export function distanceText({
  distanceInMeters,
  unitSystem,
  forceLongestUnit = false,
  roundToNearestDecimal = false,
  withSpace = false,
}: {
  distanceInMeters: number;
  unitSystem: UnitSystem;
  forceLongestUnit?: boolean;
  roundToNearestDecimal?: boolean;
  withSpace?: boolean;
}) {
  switch (unitSystem) {
    case "metric":
      const distanceInKilometers = convertDistance(
        distanceInMeters,
        "kilometers",
        roundToNearestDecimal
      );

      if (forceLongestUnit || distanceInKilometers.length > 1) {
        return formattedLengthString(distanceInKilometers, withSpace);
      }

      return formattedLengthString(
        convertDistance(distanceInMeters, "meters"),
        withSpace
      );
    case "imperial":
      const distanceInMiles = convertDistance(
        distanceInMeters,
        "miles",
        roundToNearestDecimal
      );

      if (forceLongestUnit || distanceInMiles.length >= 0.1) {
        return formattedLengthString(distanceInMiles, withSpace);
      }

      return formattedLengthString(
        convertDistance(distanceInMeters, "feet"),
        withSpace
      );
  }
}

export function speedInUnits(
  speedInMetersPerSecond: number,
  unitSystem: UnitSystem
): string {
  if (unitSystem === "metric") {
    return `${speedInMetersPerSecond.toFixed(1)} m/s`;
  } else {
    const speedInFeetPerMinute = speedInMetersPerSecond * 3.28084 * 60;
    return `${Math.round(speedInFeetPerMinute)} ft/min`;
  }
}

export function verticalSpeedInUnits(
  speedInMetersPerSecond: number,
  unitSystem: UnitSystem
): string {
  if (unitSystem === "metric") {
    const speedInMetersPerMinute = speedInMetersPerSecond * 60;
    return `${Math.round(speedInMetersPerMinute)} m/min`;
  } else {
    const speedInFeetPerMinute = speedInMetersPerSecond * 3.28084 * 60;
    return `${Math.round(speedInFeetPerMinute)} ft/min`;
  }
}
