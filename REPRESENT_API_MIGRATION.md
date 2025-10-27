# Migration to Represent API (Open North)

This document explains the migration from the House of Commons XML API to the Represent API from Open North.

## Why We Migrated

### Problem with House of Commons XML
```
❌ CORS Error: Access to fetch at 'https://www.ourcommons.ca/Members/en/search/xml'
   from origin 'https://localhost' has been blocked by CORS policy
```

The House of Commons XML endpoint doesn't allow browser requests, causing CORS errors in our Capacitor app.

### Solution: Represent API
```
✅ https://represent.opennorth.ca - CORS-friendly, JSON-based, open-source API
```

## What Changed

### Old Implementation (XML-based)
```typescript
// ❌ Old - caused CORS errors
const response = await fetch('https://www.ourcommons.ca/Members/en/search/xml');
const xmlData = await response.text();
const parsed = await parseStringPromise(xmlData); // Required xml2js library
```

### New Implementation (JSON-based)
```typescript
// ✅ New - no CORS issues
const response = await fetch('https://represent.opennorth.ca/representatives/?representative_set=house-of-commons&limit=1000');
const data = await response.json(); // Native JSON parsing
```

## API Comparison

| Feature | House of Commons XML | Represent API |
|---------|---------------------|---------------|
| **CORS Support** | ❌ No | ✅ Yes |
| **Format** | XML | JSON |
| **Pagination** | No | Yes (via `meta.next`) |
| **Office Info** | Limited | Full (constituency + legislature) |
| **Social Media** | No | Yes (Twitter, Facebook) |
| **Update Frequency** | Real-time | ~Daily |
| **Documentation** | Limited | [Full docs](https://represent.opennorth.ca/api/) |

## New File Structure

```
client/src/lib/data-sources/
├── representAPI.ts           ← New! Direct Represent API integration
├── federalDataSource.ts      ← Updated to re-export from representAPI.ts
├── provincialDataSource.ts   ← Unchanged
└── municipalDataSource.ts    ← Unchanged

client/src/hooks/
└── useDataLoader.ts          ← New! React hook for loading MP data
```

## Usage Examples

### 1. Basic Usage - Fetch All MPs

```typescript
import { fetchHouseOfCommonsMPs } from '@/lib/data-sources/federalDataSource';

// Fetch all current MPs
const mps = await fetchHouseOfCommonsMPs();
console.log(`Loaded ${mps.length} MPs`);

// Each MP has:
mps.forEach(mp => {
  console.log({
    name: mp.name,              // "Justin Trudeau"
    riding: mp.riding,          // "Papineau"
    province: mp.province,      // "Quebec"
    party: mp.party,            // "Liberal"
    email: mp.email,            // "justin.trudeau@parl.gc.ca"
    phone: mp.phone,            // Office phone
    offices: mp.offices,        // Array of offices with addresses
  });
});
```

### 2. React Hook Usage

```tsx
import { useDataLoader } from '@/hooks/useDataLoader';

function MPListPage() {
  const { mps, loading, error, reload, isStale } = useDataLoader();

  if (loading) {
    return <div>Loading MPs from Represent API...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={reload}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Canadian MPs ({mps.length})</h1>
      {isStale && (
        <button onClick={reload}>Data is stale - Refresh</button>
      )}
      <ul>
        {mps.map(mp => (
          <li key={mp.id}>
            <strong>{mp.name}</strong> ({mp.party})
            <br />
            {mp.riding}, {mp.province}
            <br />
            {mp.email && <a href={`mailto:${mp.email}`}>{mp.email}</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Search MPs by Name

```typescript
import { searchMPsByName } from '@/lib/data-sources/federalDataSource';

// Search for MPs matching "Singh"
const results = await searchMPsByName('Singh');
console.log(`Found ${results.length} MPs`);
```

### 4. Find MP by Riding

```typescript
import { fetchMPByRiding } from '@/lib/data-sources/federalDataSource';

// Get MP for a specific riding
const mp = await fetchMPByRiding('Papineau');
if (mp) {
  console.log(`${mp.name} represents ${mp.riding}`);
}
```

## Data Structure

### FederalMP Type
```typescript
interface FederalMP {
  id: string;               // Unique ID (district slug)
  name: string;             // Full name
  firstName: string;        // First name
  lastName: string;         // Last name
  riding: string;           // Electoral district
  province: string;         // Province/territory
  party: string;            // Political party
  email?: string;           // Email address
  photoUrl?: string;        // Photo URL
  profileUrl?: string;      // Represent API profile
  personalUrl?: string;     // Personal website
  phone?: string;           // Primary office phone
  offices?: Array<{         // Office locations
    type: 'constituency' | 'hill' | 'legislature';
    address?: string;
    phone?: string;
    fax?: string;
  }>;
  social?: {                // Social media
    twitter?: string;
    facebook?: string;
  };
}
```

## Pagination Handling

The Represent API uses pagination with a limit of 1000 items per page. Our implementation automatically handles this:

```typescript
let allMPs: RepresentMP[] = [];
let nextUrl: string | null = 'https://represent.opennorth.ca/...';

while (nextUrl) {
  const response = await fetch(nextUrl);
  const data = await response.json();

  allMPs.push(...data.objects);

  // Get next page URL from meta.next
  nextUrl = data.meta.next;
}
```

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
  const mps = await fetchHouseOfCommonsMPs();
} catch (error) {
  // Logs: [RepresentAPI] Failed to fetch MPs: <error details>
  console.error('Failed to load MPs:', error);
}
```

## Migration Checklist

- [x] ✅ Created `representAPI.ts` with Represent API integration
- [x] ✅ Updated `federalDataSource.ts` to re-export from `representAPI.ts`
- [x] ✅ Removed XML parsing code (`xml2js` dependency)
- [x] ✅ Created `useDataLoader.ts` React hook
- [x] ✅ Updated data loader to use new API
- [ ] 🔄 Test on Android device
- [ ] 🔄 Test on iOS device
- [ ] 🔄 Verify all 343 MPs load successfully

## Troubleshooting

### Q: Still seeing CORS errors?
**A:** Make sure you've rebuilt the app after migration:
```bash
npm run build
npx cap sync
```

### Q: Getting fewer than 343 MPs?
**A:** Check the console for pagination logs. The Represent API should return all current MPs across multiple pages.

### Q: Missing office information?
**A:** The Represent API includes office data in the `offices` array. Check `mp.offices` for constituency and legislature office details.

### Q: Want to use the old v3 bundled API instead?
**A:** The v3 API (`/api/v3/representatives/all`) is still available and uses bundled House of Commons data. Just import from `@/lib/api/v2` instead:
```typescript
import { fetchAllMPsV2 } from '@/lib/api/v2';
```

## References

- [Represent API Documentation](https://represent.opennorth.ca/api/)
- [Open North GitHub](https://github.com/opennorth/represent-canada)
- [API Endpoint Explorer](https://represent.opennorth.ca/representatives/)
