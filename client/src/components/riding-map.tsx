import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RidingMapProps {
  boundaryUrl: string;
  ridingName: string;
  province?: string;
  className?: string;
}

export function RidingMap({ boundaryUrl, ridingName, province, className }: RidingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

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
        setUseFallback(false);

        // First, try to get the boundary metadata to get the centroid
        const metadataUrl = `https://represent.opennorth.ca${boundaryUrl}`;
        const metadataResponse = await fetch(metadataUrl);

        if (!metadataResponse.ok) {
          throw new Error('Failed to fetch boundary metadata');
        }

        const metadata = await metadataResponse.json();
        const centroid = metadata.centroid;

        // Try to fetch the simplified shape
        const shapeUrl = `https://represent.opennorth.ca${boundaryUrl}simple_shape`;
        const shapeResponse = await fetch(shapeUrl);

        if (shapeResponse.ok) {
          const geoJson = await shapeResponse.json();

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

          // Add marker at centroid
          L.marker([centroid.coordinates[1], centroid.coordinates[0]], {
            icon: L.divIcon({
              html: '<div style="background: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
              className: '',
              iconSize: [12, 12],
            })
          }).addTo(map);

        } else {
          // Fallback: just show the centroid on the map
          console.warn('Shape fetch failed, using centroid fallback');
          setUseFallback(true);

          const lat = centroid.coordinates[1];
          const lng = centroid.coordinates[0];

          map.setView([lat, lng], 12);

          // Add a marker at the centroid
          L.marker([lat, lng]).addTo(map)
            .bindPopup(`<strong>${ridingName}</strong>`)
            .openPopup();

          // Add a circle to show approximate area
          L.circle([lat, lng], {
            radius: 3000, // 3km radius
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
          }).addTo(map);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching boundary:', err);
        setError(null); // Don't show error, just use fallback
        setUseFallback(true);
        setLoading(false);

        // Fallback: Show a general area map
        if (province && ridingName) {
          // Try to geocode using the riding name and province
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ridingName + ', ' + province + ', Canada')}`;

          fetch(geocodeUrl)
            .then(res => res.json())
            .then(data => {
              if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 11);
                L.marker([lat, lon]).addTo(map)
                  .bindPopup(`<strong>${ridingName}</strong>`)
                  .openPopup();
              } else {
                // Last fallback: center on Canada
                map.setView([56.1304, -106.3468], 4);
              }
            })
            .catch(() => {
              map.setView([56.1304, -106.3468], 4);
            });
        }
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
