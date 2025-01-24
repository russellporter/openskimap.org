import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { FeatureType, SkiAreaProperties } from "openskidata-format";
import React, { useEffect, useState } from "react";
import { FeatureFavoriteService } from "./services/FeatureFavoriteService";

interface SkiAreaFavoriteButtonProps {
  skiAreaProperties: SkiAreaProperties;
}

export const SkiAreaFavoriteControl: React.FunctionComponent<
  SkiAreaFavoriteButtonProps
> = (props) => {
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    setIsFavorite(
      FeatureFavoriteService.isFavorite(props.skiAreaProperties.id)
    );
  }, [props.skiAreaProperties.id]);

  const toggleFavorite = () => {
    if (isFavorite) {
      FeatureFavoriteService.removeFavorite(props.skiAreaProperties.id);
    } else {
      FeatureFavoriteService.addFavorite(
        props.skiAreaProperties.id,
        FeatureType.SkiArea
      );
    }
    setIsFavorite(!isFavorite);
  };

  return (
    <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
      <IconButton
        key="favorite"
        size="small"
        style={{
          marginInlineStart: "auto",
        }}
        onClick={toggleFavorite}
      >
        {isFavorite ? <Favorite color="primary" /> : <FavoriteBorder />}
      </IconButton>
    </Tooltip>
  );
};
