/**
 * Geolocation helper — Haversine formula
 * Center: โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง
 * 121 ถ. เคหะร่มเกล้า แขวงคลองสองต้นนุ่น เขตลาดกระบัง กรุงเทพมหานคร 10520
 */

// Approx coordinates for โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง (event venue)
export const CENTER_LAT = 13.741001;
export const CENTER_LNG = 100.716716;
export const MAX_RADIUS_KM = 5;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance in km
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if the given coordinates are within the allowed radius of the center
 */
export function isWithinRadius(
  lat: number,
  lng: number,
  centerLat = CENTER_LAT,
  centerLng = CENTER_LNG,
  radiusKm = MAX_RADIUS_KM
): { allowed: boolean; distanceKm: number } {
  const distanceKm = haversineKm(lat, lng, centerLat, centerLng);
  return { allowed: distanceKm <= radiusKm, distanceKm };
}

