export type LocationMode = "coords" | "city" | "ip" | "none";

export type LocationInfo =
  | { lat: number; lon: number }
  | {
      query: string;
      formatted: string;
      placeId: string;
      lat: number;
      lon: number;
    }
  | { ip: string; city?: string; country?: string; lat: number; lon: number }
  | null;

export type AdvertisementFilters = {
  take: number;
  skip: number;
  status?: string;
  type?: string;
  housingType?: string;
  city?: string;
  qLat?: number;
  qLon?: number;
  radiusMeters: number;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  rooms?: number;
  floor?: number;
  bathrooms?: number;
  elevator?: boolean;
  airConditioning?: boolean;
  heating?: boolean;
  concierge?: boolean;
  parking?: boolean;
  garage?: boolean;
  furnished?: boolean;
  solarPanels?: boolean;
  balcony?: boolean;
  terrace?: boolean;
  garden?: boolean;
};