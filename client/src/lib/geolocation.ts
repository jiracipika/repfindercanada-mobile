import { Geolocation, PositionOptions } from '@capacitor/geolocation';

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    // Check permissions
    let permissionStatus = await Geolocation.checkPermissions();

    // Request permissions if not granted
    if (permissionStatus.location !== 'granted') {
      permissionStatus = await Geolocation.requestPermissions({ permissions: ['location'] });
    }

    // If permission is not granted after request, throw an error
    if (permissionStatus.location !== 'granted') {
      throw new Error('Approximate location permission was not granted. Please enable it in your device settings or enter your postal code manually.');
    }

    // If we have permission, get the location
    const options: PositionOptions = {
      enableHighAccuracy: false, // Use approximate location
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };
    const position = await Geolocation.getCurrentPosition(options);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };

  } catch (error) {
    console.error("Geolocation error:", error);
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // This would integrate with a geocoding service
  // For now, return null to indicate postal code lookup is needed
  return null;
}
