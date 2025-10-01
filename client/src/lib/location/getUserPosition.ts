import { Geolocation, Position } from '@capacitor/geolocation';

export const getCurrentLocation = async (): Promise<Position> => {
  let hasPermission = false;
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === 'granted') {
      hasPermission = true;
    } else {
      const requestStatus = await Geolocation.requestPermissions();
      if (requestStatus.location === 'granted') {
        hasPermission = true;
      } else {
        throw new Error("Location permission denied");
      }
    }

    if (hasPermission) {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
      return position;
    } else {
      throw new Error("Location permission not granted");
    }
  } catch (error) {
    console.error("Error getting current location:", error);
    throw error; // Re-throw to be handled by the caller
  }
};
