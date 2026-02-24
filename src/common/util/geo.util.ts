export function sortByDistance(drivers: any, lat: number, lng: number) {
  return drivers.sort((a: any, b: any) => {
    const d1 = haversineDistance(lat, lng, a.lat, a.lng);
    const d2 = haversineDistance(lat, lng, b.lat, b.lng);
    return d1 - d2;
  });
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateETA(distanceKm: number, avgSpeedKmH = 30): number {
  const hours = distanceKm / avgSpeedKmH;
  return Math.round(hours * 60);
}
