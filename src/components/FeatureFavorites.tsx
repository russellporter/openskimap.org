import { Favorite } from "@mui/icons-material";
import {
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import centroid from "@turf/centroid";
import { LiftFeature, RunFeature, SkiAreaFeature } from "openskidata-format";
import React, { useEffect, useState } from "react";
import EventBus from "./EventBus";
import { loadGeoJSON } from "./GeoJSONLoader";
import {
  FeatureFavoriteService,
  FeatureFavoriteServiceStorageItem,
} from "./services/FeatureFavoriteService";

interface FavoritesListProps {
  eventBus: EventBus;
}

type FavoritesListData = {
  storageItemData: FeatureFavoriteServiceStorageItem;
  featureData: SkiAreaFeature | LiftFeature | RunFeature;
};

export const FeatureFavorites: React.FunctionComponent<FavoritesListProps> = ({
  eventBus,
}) => {
  const [favorites, setFavorites] = useState<FavoritesListData[]>([]);

  useEffect(() => {
    const loadFavorites = async () => {
      const storedFavorites = FeatureFavoriteService.getFavorites();
      const loadedFavorites = await Promise.all(
        Object.keys(storedFavorites).map((id) =>
          loadGeoJSON<SkiAreaFeature>(id)
        )
      );

      const favoriteList = loadedFavorites
        .map((loadedFeature) => ({
          storageItemData: storedFavorites[loadedFeature.properties.id],
          featureData: loadedFeature,
        }))
        .sort(
          (a, b) =>
            a.storageItemData.tsAdded.valueOf() -
            b.storageItemData.tsAdded.valueOf()
        )
        .reverse();

      setFavorites(favoriteList);
    };

    loadFavorites();
  }, []);

  if (Object.keys(favorites).length === 0) {
    return <></>;
  } else {
    return (
      <>
        <Divider />
        <List>
          <ListItem>
            <ListItemIcon>
              <Favorite />
            </ListItemIcon>
            <ListItemText primary={"Favorites"} />
          </ListItem>
          {favorites.map((favorite) => (
            <ListItemButton
              dense
              key={favorite.featureData.properties.id}
              onClick={() => {
                const geometry = centroid(favorite.featureData).geometry;
                eventBus.showInfo({
                  id: favorite.featureData.properties.id,
                  panToPosition: geometry && [
                    geometry.coordinates[0],
                    geometry.coordinates[1],
                  ],
                });
              }}
            >
              <ListItemText
                primary={favorite.featureData.properties.name}
                secondary={
                  favorite.featureData.properties.location?.localized.en
                    .region ??
                  favorite.featureData.properties.location?.localized.en.country
                }
              />
            </ListItemButton>
          ))}
        </List>
      </>
    );
  }
};
