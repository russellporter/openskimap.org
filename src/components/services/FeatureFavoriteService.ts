import { FeatureType } from "openskidata-format";

export type FeatureFavoriteServiceStorageItem = {
  id: string;
  featureType: FeatureType;
  tsAdded: Date;
};

export type FeatureFavoriteServiceStorage = {
  [id: string]: FeatureFavoriteServiceStorageItem;
};

export class FeatureFavoriteService {
  private static STORAGE_KEY = "favorites";

  static getFavorites(): FeatureFavoriteServiceStorage {
    const favorites = localStorage.getItem(this.STORAGE_KEY);
    return favorites
      ? (JSON.parse(favorites) as FeatureFavoriteServiceStorage)
      : {};
  }

  static addFavorite(id: string, featureType: FeatureType): void {
    const favorites = this.getFavorites();
    if (!favorites[id]) {
      favorites[id] = {
        id: id,
        featureType: featureType,
        tsAdded: new Date(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    }
  }

  static removeFavorite(id: string): void {
    const favorites = this.getFavorites();
    if (favorites[id]) {
      delete favorites[id];
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
  }

  static isFavorite(id: string): boolean {
    return id in this.getFavorites();
  }
}
