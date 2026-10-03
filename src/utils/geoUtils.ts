// Geolocation & Anti-Fraud Geofencing Utilities
// Calculates on-site proximity between field inspectors and municipal physical assets

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  formattedDistance: string;
  statusMessage: string;
  warningBadge?: string;
  inspectorCoords: GeoCoordinates;
  assetCoords: GeoCoordinates;
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Fetches the user's current GPS position using browser Geolocation API
 */
export function getCurrentPosition(timeoutMs = 10000): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 10000
      }
    );
  });
}

/**
 * Verifies if the inspector is physically within the geofenced perimeter of the asset
 * Default threshold: 250 meters
 */
export function verifyGeofence(
  inspectorCoords: GeoCoordinates,
  assetCoords: GeoCoordinates,
  thresholdMeters = 250
): GeofenceResult {
  const distanceMeters = calculateDistanceMeters(
    inspectorCoords.latitude,
    inspectorCoords.longitude,
    assetCoords.latitude,
    assetCoords.longitude
  );

  const isWithinGeofence = distanceMeters <= thresholdMeters;

  let formattedDistance = '';
  if (distanceMeters < 1000) {
    formattedDistance = `${distanceMeters} meters`;
  } else {
    formattedDistance = `${(distanceMeters / 1000).toFixed(2)} km`;
  }

  let statusMessage = '';
  let warningBadge: string | undefined = undefined;

  if (isWithinGeofence) {
    statusMessage = `Verified on-site physical presence (${formattedDistance} from registered asset location).`;
  } else {
    statusMessage = `Geofence mismatch: Inspector is ${formattedDistance} away from registered coordinates (Threshold: ${thresholdMeters}m). Audit will record this delta.`;
    warningBadge = `Geofence Delta: ${formattedDistance}`;
  }

  return {
    isWithinGeofence,
    distanceMeters,
    formattedDistance,
    statusMessage,
    warningBadge,
    inspectorCoords,
    assetCoords
  };
}
