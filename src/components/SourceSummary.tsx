import { Link, Typography } from "@material-ui/core";
import Source, { SourceType } from "openskidata-format/dist/Source";
import * as React from "react";

export const SourceSummary: React.SFC<{ sources: Source[] }> = (props) => {
  const hasOpenStreetMapSource = props.sources.some(
    (source) => source.type === SourceType.OPENSTREETMAP
  );
  const aggregatedSources = props.sources.reduce(
    (aggregation: Map<SourceType, string[]>, source) => {
      if (!aggregation.has(source.type)) {
        aggregation.set(source.type, []);
      }
      aggregation.get(source.type)!.push(source.id);
      return aggregation;
    },
    new Map<SourceType, string[]>()
  );
  return (
    <Typography variant="subtitle1" color="textSecondary">
      Source:{" "}
      {[...aggregatedSources.keys()].map((sourceType, index) => {
        const ids = aggregatedSources.get(sourceType)!;
        return (
          <span key={"source-" + index}>
            {ids.length === 1 ? (
              <Link
                href={getSourceURL({ type: sourceType, id: ids[0] })}
                target="_blank"
              >
                {getSourceName(sourceType)}
              </Link>
            ) : (
              <>
                {getSourceName(sourceType)}
                {" ("}
                {ids.map((id, index) => (
                  <span key={"source-id-" + id}>
                    <Link
                      href={getSourceURL({ type: sourceType, id: id })}
                      target="_blank"
                    >
                      {index + 1}
                    </Link>
                    {index !== ids.length - 1 ? ", " : ""}
                  </span>
                ))}
                {")"}
              </>
            )}
            {index !== aggregatedSources.size - 1 || !hasOpenStreetMapSource
              ? ", "
              : ""}
          </span>
        );
      })}
      {
        // Statistics are calculated from OpenStreetMap runs and lifts, so always include it
        !hasOpenStreetMapSource ? "OpenStreetMap" : null
      }
    </Typography>
  );
};

function getSourceURL(source: Source): string {
  switch (source.type) {
    case SourceType.OPENSTREETMAP:
      return "https://www.openstreetmap.org/" + source.id;
    case SourceType.SKIMAP_ORG:
      return "https://www.skimap.org/SkiAreas/view/" + source.id;
  }
}

function getSourceName(type: SourceType): string {
  switch (type) {
    case SourceType.OPENSTREETMAP:
      return "OpenStreetMap";
    case SourceType.SKIMAP_ORG:
      return "Skimap.org";
  }
}
