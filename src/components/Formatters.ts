import {
  Activity,
  RunDifficulty,
  RunGrooming,
  RunUse
} from "openskidata-format";

export function formattedRunUse(uses: RunUse[], grooming: RunGrooming | null) {
  const formattedUses = uses.map(use => {
    switch (use) {
      case RunUse.Downhill:
        return grooming !== RunGrooming.Backcountry
          ? "Downhill ski run"
          : "Downhill ski route";
      case RunUse.Nordic:
        return grooming !== RunGrooming.Backcountry
          ? "Nordic ski trail"
          : "Nordic ski route";
      case RunUse.Skitour:
        return grooming !== RunGrooming.Backcountry
          ? "Ski touring trail"
          : "Ski touring route";
      case RunUse.Sled:
        return grooming !== RunGrooming.Backcountry
          ? "Sledding trail"
          : "Sledding route";
      case RunUse.Hike:
        return grooming !== RunGrooming.Backcountry
          ? "Hiking trail"
          : "Hiking route";
      case RunUse.Sleigh:
        return "Sleigh route";
      case RunUse.IceSkate:
        return "Ice skating route";
      case RunUse.SnowPark:
        return "Terrain park";
      case RunUse.Playground:
        return "Ski playground";
      case RunUse.Connection:
        return grooming !== RunGrooming.Backcountry
          ? "Connector trail"
          : "Connector route";
      default:
        return null;
    }
  });
  return formattedUses.filter(use => use !== null).join(", ");
}

export function formattedDifficultyName(difficulty: RunDifficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function formattedActivityName(activity: Activity) {
  return activity.charAt(0).toUpperCase() + activity.slice(1);
}
