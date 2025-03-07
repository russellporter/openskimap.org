import InfoIcon from "@mui/icons-material/Info";
import { Link, Tooltip, Typography } from "@mui/material";
import { centroid } from "@turf/centroid";
import { SkiAreaFeature } from "openskidata-format";
import React from "react";

export const SlopeAspectRose: React.FC<{ feature: SkiAreaFeature }> = ({
  feature,
}) => {
  const id = feature.properties.id;
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imageUrl = `https://openskistats.org/ski-areas/roses-openskimap/${id}.svg`;

  // Determine hemisphere based on feature's centroid
  const featureCentroid = centroid(feature);
  const isNorthernHemisphere = featureCentroid.geometry.coordinates[1] >= 0;

  return (
    <div style={{ margin: "16px 0", display: imageLoaded ? "block" : "none" }}>
      <Typography
        variant="h6"
        gutterBottom
        style={{ display: "flex", alignItems: "center" }}
      >
        Slope Aspect Rose
        <Tooltip
          enterTouchDelay={0}
          leaveTouchDelay={15000}
          title={
            <div>
              <Typography
                variant="body2"
                style={{ fontWeight: "bold", marginBottom: "8px" }}
              >
                How to read this rose diagram:
              </Typography>

              <Typography variant="body2" style={{ marginBottom: "4px" }}>
                • <strong>Petals:</strong> Show which compass directions the
                downhill ski runs face
              </Typography>
              <Typography variant="body2" style={{ marginBottom: "4px" }}>
                • <strong>Petal length:</strong> Longer petals = more terrain
                facing that direction
              </Typography>
              <Typography variant="body2" style={{ marginBottom: "4px" }}>
                • <strong>Snowflake:</strong> Overall average slope aspect
              </Typography>
              <Typography variant="body2" style={{ marginBottom: "8px" }}>
                • <strong>Sun lines:</strong> Winter sun paths across the sky
              </Typography>

              <Typography
                variant="body2"
                style={{
                  fontWeight: "bold",
                  marginBottom: "8px",
                  marginTop: "12px",
                }}
              >
                Why aspect matters:
              </Typography>

              {isNorthernHemisphere ? (
                <>
                  <Typography variant="body2" style={{ marginBottom: "4px" }}>
                    • <strong>North (top):</strong> Retains snow longer, often
                    colder
                  </Typography>
                  <Typography variant="body2" style={{ marginBottom: "4px" }}>
                    • <strong>South (bottom):</strong> More sun exposure,
                    softens faster
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" style={{ marginBottom: "4px" }}>
                    • <strong>South (bottom):</strong> Retains snow longer,
                    often colder
                  </Typography>
                  <Typography variant="body2" style={{ marginBottom: "4px" }}>
                    • <strong>North (top):</strong> More sun exposure, softens
                    faster
                  </Typography>
                </>
              )}
              <Typography variant="body2" style={{ marginBottom: "4px" }}>
                • <strong>East (right):</strong> Morning sun, often good morning
                skiing, typically colder than west-facing slopes
              </Typography>
              <Typography variant="body2" style={{ marginBottom: "8px" }}>
                • <strong>West (left):</strong> Afternoon sun, softens later in
                day, typically warmer than east-facing slopes
              </Typography>

              <Typography
                variant="body2"
                style={{ fontSize: "0.8rem", marginTop: "8px" }}
              >
                Provided by{" "}
                <Link
                  href="https://openskistats.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "white" }}
                >
                  OpenSkiStats
                </Link>
              </Typography>
            </div>
          }
          arrow
        >
          <InfoIcon
            fontSize="small"
            style={{
              marginLeft: "8px",
              cursor: "pointer",
            }}
          />
        </Tooltip>
      </Typography>
      {feature.properties.activities.some(
        (activity) => activity !== "downhill"
      ) && (
        <Typography variant="body2" color="textSecondary">
          Only downhill runs are included in the analysis.
        </Typography>
      )}
      <div style={{ textAlign: "center" }}>
        <img
          src={imageUrl}
          alt="Slope aspect rose"
          style={{
            pointerEvents: "none",
            maxWidth: "100%",
            height: "auto",
            display: imageLoaded ? "inline-block" : "none",
          }}
          onLoad={() => setImageLoaded(true)}
        />
      </div>
      <Typography
        variant="caption"
        color="textSecondary"
        style={{ display: "block", marginTop: "8px" }}
      >
        Rose from{" "}
        <Link
          href="https://openskistats.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenSkiStats
        </Link>{" "}
        available under a{" "}
        <Link
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY 4.0 license
        </Link>{" "}
        .
      </Typography>
    </div>
  );
};
