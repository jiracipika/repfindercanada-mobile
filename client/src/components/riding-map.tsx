import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

interface RidingMapProps {
  boundaryUrl: string;
  extent: number[]; // [minLng, minLat, maxLng, maxLat]
  className?: string;
}

/**
 * Component to fit map bounds when boundary loads
 */
function BoundsFitter({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, bounds]);

  return null;
}

/**
 * Interactive Leaflet map displaying electoral district boundary
 * Uses OpenStreetMap tiles (free, no API key required)
 */
export function RidingMap({ boundaryUrl, extent, className = '' }: RidingMapProps) {
  const [boundaryData, setBoundaryData] = useState<GeoJsonObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert extent to Leaflet bounds format
  const bounds: LatLngBoundsExpression = [
    [extent[1], extent[0]], // Southwest [lat, lng]
    [extent[3], extent[2]], // Northeast [lat, lng]
  ];

  // Calculate center point
  const center: [number, number] = [
    (extent[1] + extent[3]) / 2, // Center lat
    (extent[0] + extent[2]) / 2, // Center lng
  ];

  useEffect(() => {
    const fetchBoundary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch simplified boundary shape from OpenNorth
        const shapeUrl = `https://represent.opennorth.ca${boundaryUrl}simple_shape?format=json`;
        const response = await fetch(shapeUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch boundary: ${response.status}`);
        }

        const data = await response.json();
        setBoundaryData(data);
      } catch (err) {
        console.error('Error fetching boundary:', err);
        setError('Failed to load boundary data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoundary();
  }, [boundaryUrl]);

  if (isLoading) {
    return (
      <div className={`relative bg-muted flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error || !boundaryData) {
    return (
      <div className={`relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center ${className}`}>
        <div className="text-center px-4">
          <p className="text-xs sm:text-sm font-medium text-foreground">Map unavailable</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {error || 'Boundary data not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg sm:rounded-xl z-0"
        scrollWheelZoom={false}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
      >
        {/* OpenStreetMap tiles - free, no API key needed */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Riding boundary overlay */}
        <GeoJSON
          data={boundaryData}
          style={{
            color: '#3b82f6', // Blue border
            weight: 3,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          }}
        />

        {/* Fit bounds to boundary */}
        <BoundsFitter bounds={bounds} />
      </MapContainer>
    </div>
  );
}
