import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin } from 'lucide-react';

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

  useEffect(() => {
    if (!mapContainer.current || !boundaryUrl) return;

    let map: L.Map | null = null;

    const initMap = async () => {
      try {
        setLoading(true);

        // Create map
        map = L.map(mapContainer.current!, {
          zoomControl: true,
          attributionControl: true,
        });

        mapInstance.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // First, try to get the actual GeoJSON boundary shape
        let shapeLoaded = false;

        try {
          // Try to fetch directly from Represent API
          const shapeUrl = `https://represent.opennorth.ca${boundaryUrl}simple_shape`;
          const shapeResponse = await fetch(shapeUrl);

          if (shapeResponse.ok) {
            const geoJson = await shapeResponse.json();

            // Add the actual boundary shape to the map
            const geoJsonLayer = L.geoJSON(geoJson, {
              style: {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.8,
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
              },
            }).addTo(map);

            // Fit map to the boundary
            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { padding: [30, 30] });

            // Get center of the boundary
            const center = bounds.getCenter();

            // Add marker at center
            const customIcon = L.divIcon({
              html: `
                <div style="position: relative;">
                  <div style="
                    background: #3b82f6;
                    width: 24px;
                    height: 24px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  "></div>
                  <div style="
                    position: absolute;
                    top: 6px;
                    left: 6px;
                    background: white;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                  "></div>
                </div>
              `,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 24],
            });

            L.marker(center, { icon: customIcon })
              .addTo(map)
              .bindPopup(`
                <div style="text-align: center; padding: 4px;">
                  <strong style="font-size: 14px;">${ridingName}</strong>
                  ${province ? `<br/><span style="font-size: 12px; color: #666;">${province}</span>` : ''}
                </div>
              `)
              .openPopup();

            shapeLoaded = true;
          }
        } catch {
          // Shape unavailable — fall through to the extent-rectangle fallback below
        }

        // If shape didn't load, fall back to metadata with extent rectangle
        if (!shapeLoaded) {
          let metadataLoaded = false;

          try {
            const metadataUrl = `https://represent.opennorth.ca${boundaryUrl}`;
            const response = await fetch(metadataUrl);

            if (response.ok) {
              const data = await response.json();
              const centroid = data.centroid;
              const extent = data.extent; // [west, south, east, north]

              // Center on the riding
              const lat = centroid.coordinates[1];
              const lng = centroid.coordinates[0];
              map.setView([lat, lng], 12);

              // Create a custom marker icon
              const customIcon = L.divIcon({
                html: `
                  <div style="position: relative;">
                    <div style="
                      background: #3b82f6;
                      width: 24px;
                      height: 24px;
                      border-radius: 50% 50% 50% 0;
                      transform: rotate(-45deg);
                      border: 3px solid white;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    "></div>
                    <div style="
                      position: absolute;
                      top: 6px;
                      left: 6px;
                      background: white;
                      width: 12px;
                      height: 12px;
                      border-radius: 50%;
                    "></div>
                  </div>
                `,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 24],
              });

              // Add marker
              L.marker([lat, lng], { icon: customIcon })
                .addTo(map)
                .bindPopup(`
                  <div style="text-align: center; padding: 4px;">
                    <strong style="font-size: 14px;">${ridingName}</strong>
                    ${province ? `<br/><span style="font-size: 12px; color: #666;">${province}</span>` : ''}
                  </div>
                `)
                .openPopup();

              // If we have extent, draw a rectangle to show the approximate riding boundary
              if (extent && extent.length === 4) {
                const bounds = L.latLngBounds(
                  [extent[1], extent[0]], // southwest
                  [extent[3], extent[2]]  // northeast
                );

                L.rectangle(bounds, {
                  color: '#3b82f6',
                  weight: 2,
                  opacity: 0.6,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                }).addTo(map);

                // Fit map to the boundary with some padding
                map.fitBounds(bounds, { padding: [30, 30] });
              }

              metadataLoaded = true;
            }
          } catch {
            // Metadata unavailable — fall through to geocoding below
          }

          // Last resort: geocode the riding name. This must only run when
          // NEITHER the boundary shape NOR the metadata produced a marker,
          // otherwise the map ends up with a second, stray pin.
          if (!metadataLoaded && ridingName) {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ridingName + ', ' + (province || '') + ', Canada')}`;
            const geocodeResponse = await fetch(geocodeUrl);

            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData && geocodeData.length > 0) {
                const lat = parseFloat(geocodeData[0].lat);
                const lon = parseFloat(geocodeData[0].lon);

                map.setView([lat, lon], 11);

                L.marker([lat, lon])
                  .addTo(map)
                  .bindPopup(`<strong>${ridingName}</strong>`)
                  .openPopup();
              }
            }
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading map:', err);

        // Final fallback: try geocoding
        if (map && ridingName) {
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ridingName + ', ' + (province || '') + ', Canada')}`;

          fetch(geocodeUrl)
            .then(res => res.json())
            .then(data => {
              if (data && data.length > 0 && map) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 11);
                L.marker([lat, lon])
                  .addTo(map)
                  .bindPopup(`<strong>${ridingName}</strong>`)
                  .openPopup();
              }
            })
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [boundaryUrl, ridingName, province]);

  return (
    <div className={className}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 z-10 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}
