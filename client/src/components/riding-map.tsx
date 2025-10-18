import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RidingMapProps {
  boundaryUrl: string;
  ridingName: string;
  className?: string;
}

export function RidingMap({ boundaryUrl, ridingName, className }: RidingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !boundaryUrl) return;

    // Initialize map
    const map = L.map(mapContainer.current, {
      zoomControl: true,
      attributionControl: true,
    });

    mapInstance.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Fetch and display boundary
    const fetchBoundary = async () => {
      try {
        setLoading(true);
        setError(null);

        // Encode the boundary URL for the API endpoint
        const encodedUrl = encodeURIComponent(boundaryUrl);
        const response = await fetch(`/api/boundaries/${encodedUrl}`);

        if (!response.ok) {
          throw new Error('Failed to fetch boundary data');
        }

        const geoJson = await response.json();

        // Add GeoJSON to map
        const geoJsonLayer = L.geoJSON(geoJson, {
          style: {
            color: '#3b82f6', // Blue border
            weight: 3,
            opacity: 0.8,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          },
        }).addTo(map);

        // Fit map to boundary
        const bounds = geoJsonLayer.getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });

        // Add popup with riding name
        const center = bounds.getCenter();
        L.popup()
          .setLatLng(center)
          .setContent(`<strong>${ridingName}</strong>`)
          .openOn(map);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching boundary:', err);
        setError('Failed to load riding boundary map');
        setLoading(false);
      }
    };

    fetchBoundary();

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [boundaryUrl, ridingName]);

  return (
    <div className={className}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}
