import InfoIcon from "@mui/icons-material/Info";
import { Link, Tooltip, Typography } from "@mui/material";
import { SkiAreaProperties } from "openskidata-format";
import React from "react";

export const SlopeAspectRose: React.FC<{ id: SkiAreaProperties["id"] }> = ({
  id,
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const imageUrl = `https://openskistats.org/ski-areas/roses-openskimap/${id}.svg`;

  return (
    <div style={{ margin: "16px 0", display: imageLoaded ? "block" : "none" }}>
      <Typography
        variant="h6"
        gutterBottom
        style={{ display: "flex", alignItems: "center" }}
      >
        Slope Aspect Rose
        <Tooltip
          title={
            <div>
              <Typography variant="body2">
                This rose shows the slope aspect distribution of downhill runs,
                provided by{" "}
                <Link
                  href="https://openskistats.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "white" }}
                >
                  OpenSkiStats
                </Link>
                .
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
              color: "rgba(0, 0, 0, 0.54)",
            }}
          />
        </Tooltip>
      </Typography>
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
