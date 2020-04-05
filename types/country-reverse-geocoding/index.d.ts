export function country_reverse_geocoding(): {
  get_country: (
    lat: number,
    lng: number
  ) => { code: string; name: string } | null | Error;
};
