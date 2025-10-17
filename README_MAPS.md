# Electoral District Maps with Leaflet + OpenStreetMap

Interactive electoral district maps are now displayed in the representative details modal, showing the boundary of each riding.

## Features

- **✅ 100% Free** - No API keys, no rate limits, no signup required
- **✅ Interactive Maps** - Pan, zoom, pinch-to-zoom on mobile
- **✅ Cross-Platform** - Works on web, iOS, and Android
- **✅ OpenStreetMap** - Community-driven, open-source map tiles
- **✅ Automatic Boundaries** - Fetches riding boundaries from OpenNorth API
- **✅ Lightweight** - Only ~39KB gzipped added to bundle

## How It Works

### Data Flow

1. **Search by Postal Code**: App calls OpenNorth Represent API
2. **Boundary Data**: API returns `boundary_url` and `extent` for each representative
3. **Map Display**: When viewing a representative modal:
   - Fetches simplified GeoJSON boundary from OpenNorth
   - Renders interactive Leaflet map with OpenStreetMap tiles
   - Overlays riding boundary with blue outline
   - Auto-fits map to show entire riding

### Tech Stack

- **Leaflet** - Open-source JavaScript mapping library
- **React-Leaflet** - React components for Leaflet
- **OpenStreetMap** - Free, community-maintained map tiles
- **OpenNorth Represent API** - Canadian electoral district boundaries

## File Structure

```
client/src/
├── components/
│   ├── riding-map.tsx           # Leaflet map component
│   └── representative-modal.tsx # Updated to use Leaflet map
└── lib/
    └── representApi.ts          # Fetches boundary data

shared/
└── schema.ts                    # Schema with boundary fields
```

## Usage

No setup required! The maps work out of the box:

1. Search for any representative by postal code
2. Click on a representative to open details modal
3. Scroll to "Electoral District Map" section
4. Interactive map shows riding boundary with blue outline
5. Pan, zoom, and explore the map

## Customization

### Change Map Style

Edit `client/src/components/riding-map.tsx`:

```tsx
// Currently using OpenStreetMap standard tiles
<TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
/>

// Alternative tile providers (all free):

// OpenStreetMap HOT (Humanitarian)
<TileLayer
  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
/>

// CartoDB Light
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
/>

// CartoDB Dark
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
/>

// Stadia Smooth
<TileLayer
  url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
/>
```

### Change Boundary Style

Edit the `GeoJSON` style in `client/src/components/riding-map.tsx`:

```tsx
<GeoJSON
  data={boundaryData}
  style={{
    color: '#3b82f6',      // Border color (blue)
    weight: 3,              // Border thickness (px)
    opacity: 0.8,           // Border opacity (0-1)
    fillColor: '#3b82f6',   // Fill color (blue)
    fillOpacity: 0.2,       // Fill opacity (0-1)
  }}
/>
```

### Map Interaction Settings

Adjust map behavior in `MapContainer` props:

```tsx
<MapContainer
  scrollWheelZoom={false}  // Disable mouse wheel zoom
  dragging={true}           // Enable dragging (pan)
  touchZoom={true}          // Enable pinch-to-zoom on mobile
  doubleClickZoom={true}    // Enable double-click zoom
  zoomControl={true}        // Show zoom buttons
/>
```

## Components

### `<RidingMap>`

Interactive Leaflet map component that displays electoral district boundaries.

**Props:**
- `boundaryUrl: string` - OpenNorth boundary URL (e.g., `/boundaries/federal-electoral-districts-2023-representation-order/35079/`)
- `extent: number[]` - Bounding box `[minLng, minLat, maxLng, maxLat]`
- `className?: string` - Optional CSS classes

**Example:**
```tsx
<RidingMap
  boundaryUrl="/boundaries/federal-electoral-districts-2023-representation-order/35079/"
  extent={[-75.77, 45.35, -75.66, 45.43]}
  className="w-full h-64"
/>
```

## Troubleshooting

### Map Not Showing

1. **Check Console**: Look for Leaflet CSS errors
2. **Check Boundary Data**: Some representatives may not have boundaries in OpenNorth API
3. **Network Issues**: Ensure OpenStreetMap tile servers are accessible

### Map Shows But No Boundary

- Municipal representatives often don't have boundary data in OpenNorth
- The map will still show but without the riding outline
- Provincial/federal ridings should always have boundaries

### Leaflet CSS Not Loading

Ensure Leaflet CSS is imported in `riding-map.tsx`:
```tsx
import 'leaflet/dist/leaflet.css';
```

### Map Tiles Not Loading

- OpenStreetMap servers may be temporarily down
- Try switching to an alternative tile provider (see Customization section)
- Check browser console for CORS or network errors

## Performance

- **Bundle Size**: +39KB gzipped (Leaflet + React-Leaflet)
- **Tile Loading**: OpenStreetMap tiles are cached by browser
- **Boundary Data**: Fetched once per representative, ~5-15KB per boundary
- **Lazy Loading**: Map only loads when modal opens

## Database Migration

If using a database, the schema already includes boundary fields:

```sql
ALTER TABLE representatives
ADD COLUMN boundary_url TEXT,
ADD COLUMN boundary_extent JSONB;
```

For Drizzle ORM users:
```bash
npm run db:push
```

## Credits

- **Maps**: [Leaflet](https://leafletjs.com/) - Open-source mapping library
- **Tiles**: [OpenStreetMap](https://www.openstreetmap.org/) - Community-maintained map data
- **Boundaries**: [OpenNorth Represent API](https://represent.opennorth.ca/) - Canadian electoral districts
- **Electoral Data**: [Elections Canada](https://www.elections.ca/)

## License

- **Leaflet**: BSD-2-Clause
- **OpenStreetMap**: ODbL (Open Database License)
- **Map tiles must attribute OpenStreetMap contributors** (already included)
