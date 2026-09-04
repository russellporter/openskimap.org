import { Box, Chip, Link, Tooltip, Typography } from "@mui/material";
import {
  getSourceName,
  getSourceURL,
  SkiPassMembership,
  SourceType,
} from "openskidata-format";
import * as React from "react";
import EventBus from "./EventBus";

interface SkiAreaPassGroup {
  key: string;
  brandName: string | null;
  passes: SkiPassMembership[];
}

/** Group actual pass memberships under their optional display brand. */
export function groupByBrand(
  memberships: SkiPassMembership[],
): SkiAreaPassGroup[] {
  const groups = new Map<string, SkiAreaPassGroup>();
  for (const membership of memberships) {
    const key = membership.brandID ?? `pass:${membership.passID}`;
    const group = groups.get(key) ?? {
      key,
      brandName: membership.brandName,
      passes: [],
    };
    if (!group.passes.some((pass) => pass.passID === membership.passID)) {
      group.passes.push(membership);
    }
    groups.set(key, group);
  }
  return [...groups.values()];
}

export const SkiAreaPasses: React.FunctionComponent<{
  skiPasses: SkiPassMembership[];
  eventBus: EventBus;
}> = (props) => {
  const groups = groupByBrand(props.skiPasses);
  if (groups.length === 0) return null;

  const sources = props.skiPasses.flatMap((pass) => pass.sources);
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle1" color="textSecondary">
        Ski passes:
      </Typography>
      {groups.map((group) => (
        <Box key={group.key} sx={{ mt: 0.5 }}>
          {group.brandName !== null && (
            <Typography variant="caption" color="textSecondary">
              {group.brandName}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.25 }}>
            {group.passes.map((pass) => (
              <Tooltip
                key={pass.passID}
                title={`Show every ski area on ${pass.passName}`}
              >
                <Chip
                  label={pass.passName}
                  onClick={() =>
                    props.eventBus.setSelectedSkiPasses([pass.passID])
                  }
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      ))}
      {sources.length > 0 && (
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          Ski pass data from{" "}
          <Link href={getSourceURL(sources[0])} target="_blank">
            {getSourceName(SourceType.STORM_SKIING)}
          </Link>
        </Typography>
      )}
    </Box>
  );
};
