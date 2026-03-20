export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export const KOREA_CENTER = { lat: 36.5, lng: 127.5 };

export const MAP_RESTRICTION = {
  latLngBounds: {
    north: 38.7,
    south: 33.0,
    east: 132.0,
    west: 124.5,
  },
  strictBounds: true,
};
