import { RunUse } from "openskidata-format";

export function formattedRunUse(uses: RunUse[]) {
  const formattedUses = uses.map(use => {
    switch (use) {
      case RunUse.Downhill:
        return "Downhill ski run";
      case RunUse.Nordic:
        return "Nordic ski trail";
      case RunUse.Skitour:
        return "Ski touring route";
      case RunUse.Sled:
        return "Sledding trail";
      case RunUse.Hike:
        return "Hiking trail";
      case RunUse.Sleigh:
        return "Sleigh route";
      case RunUse.IceSkate:
        return "Ice skating route";
      case RunUse.SnowPark:
        return "Terrain park";
      case RunUse.Playground:
        return "Ski playground";
      case RunUse.Connection:
        return "Connector trail";
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
