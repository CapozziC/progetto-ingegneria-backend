import { Point } from "geojson";

/**
 *  Create a GeoJSON Point with SRID 4326 from longitude and latitude
 * @param lng longitude
 * @param lat latitude
 * @returns a GeoJSON Point with SRID 4326
 */
export const makePoint4326 = (lng: number, lat: number): Point => ({
  type: "Point",
  coordinates: [lng, lat],
});
