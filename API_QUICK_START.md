# Hybrid API Quick Start Guide

## Overview

The v2 API provides improved accuracy for postal code lookups by combining multiple official Canadian government data sources.

## Quick Start: Postal Code Lookup

### Simple Example

```bash
curl -X POST http://localhost:5000/api/v2/representatives/postal-code \
  -H "Content-Type: application/json" \
  -d '{"postalCode": "K1A0A6"}'
```

### Response Structure

```json
{
  "representative": {
    "name": "Mona Fortier",
    "party": "Liberal",
    "constituency": "Ottawa—Vanier",
    "province": "Ontario",
    "email": "mona.fortier@parl.gc.ca",
    "phone": "613-998-3531",
    "offices": [
      {
        "type": "Hill",
        "address": "House of Commons, Ottawa, ON K1A 0A6",
        "phone": "613-998-3531"
      }
    ],
    "dataQuality": {
      "source": "represent_verified",
      "confidence": "high"
    }
  },
  "lookup": {
    "postalCode": "K1A0A6",
    "riding": "Ottawa—Vanier",
    "province": "Ontario",
    "confidence": "high"
  }
}
```

## Common Use Cases

### 1. Search by Name

```bash
curl -X POST http://localhost:5000/api/v2/representatives/search-name \
  -H "Content-Type: application/json" \
  -d '{"name": "trudeau"}'
```

### 2. Get All MPs

```bash
curl http://localhost:5000/api/v2/representatives/all
```

### 3. Get MP by Riding

```bash
curl http://localhost:5000/api/v2/representatives/riding/Ottawa%20Centre
```

### 4. Get Riding Boundary

```bash
curl http://localhost:5000/api/v2/boundaries/Ottawa%20Centre?province=ON
```

## Fixing Inaccurate Postal Codes

If you discover a postal code that returns the wrong riding:

```bash
curl -X POST http://localhost:5000/api/v2/admin/postal-code-correction \
  -H "Content-Type: application/json" \
  -d '{
    "postalCode": "K1A0B1",
    "ridingName": "Ottawa Centre",
    "province": "Ontario",
    "notes": "Near boundary with Ottawa-Vanier"
  }'
```

This will save a manual correction that takes priority over API results.

## Testing Edge Cases

### Postal Codes Near Riding Boundaries

```javascript
const edgeCases = [
  "K1A0A6", // Ottawa-Vanier/Ottawa Centre boundary
  "K1Y1J5", // Ottawa Centre
  "M5V1E9", // Toronto Centre
  "H3B1H9", // Montreal
];

for (const postalCode of edgeCases) {
  const response = await fetch('/api/v2/representatives/postal-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postalCode })
  });

  const data = await response.json();
  console.log(`${postalCode}: ${data.lookup.riding} (${data.lookup.confidence})`);
}
```

## Data Quality Indicators

### Confidence Levels

- **high**: Verified with House of Commons data or manually corrected
- **medium**: From Represent API but not verified
- **low**: Uncertain or conflicting data

### Source Types

- `cache_manual`: Manually corrected (most reliable)
- `cache`: Previously verified lookup
- `represent_verified`: From Represent API, verified with House of Commons
- `represent_unverified`: From Represent API, could not verify

## Migration from V1 API

### Old Code (v1)

```typescript
const response = await fetch('/api/representatives/search', {
  method: 'POST',
  body: JSON.stringify({
    query: "K1A0A6",
    type: 'postal_code'
  })
});
```

### New Code (v2)

```typescript
const response = await fetch('/api/v2/representatives/postal-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postalCode: "K1A0A6"
  })
});
```

## Rate Limits

- **Represent API**: 60 requests/minute (cached to minimize usage)
- **House of Commons XML**: No stated limit (cached for 24 hours)
- **ourcommons.ca Scraping**: Respectful 1 request/second (cached for 7 days)

## Performance Tips

1. **Use caching**: First lookup is slower, subsequent lookups are instant
2. **Batch operations**: Use search-name or get all MPs for multiple lookups
3. **Avoid scraping on-demand**: Contact scraping is slow, use cached data when possible

## Error Handling

```typescript
try {
  const response = await fetch('/api/v2/representatives/postal-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postalCode: userInput })
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.log('No representative found for this postal code');
    } else if (response.status === 400) {
      console.log('Invalid postal code format');
    } else {
      console.log('API error');
    }
    return;
  }

  const data = await response.json();

  // Check data quality
  if (data.lookup.confidence === 'low') {
    console.warn('Low confidence result:', data.lookup.warnings);
  }

  // Use representative data
  console.log(`Your MP is ${data.representative.name}`);

} catch (error) {
  console.error('Network error:', error);
}
```

## Admin Endpoints

### View Postal Code Cache

```bash
curl http://localhost:5000/api/v2/admin/postal-code-cache
```

Returns all cached postal codes with their sources and confidence levels.

### Scrape MP Contact Info

```bash
curl -X POST http://localhost:5000/api/v2/admin/scrape-mp-contact \
  -H "Content-Type: application/json" \
  -d '{"profileUrl": "https://www.ourcommons.ca/members/en/john-smith(12345)"}'
```

Scrapes detailed contact information for a specific MP.

## Frontend Integration Example

```typescript
// Create a hook for the new API
import { useQuery } from '@tanstack/react-query';

export function useRepByPostalCode(postalCode: string) {
  return useQuery({
    queryKey: ['representative', 'postal-code', postalCode],
    queryFn: async () => {
      const response = await fetch('/api/v2/representatives/postal-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch representative');
      }

      return response.json();
    },
    enabled: postalCode.length === 6, // Only run for valid postal codes
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}

// Use in component
function MyComponent() {
  const [postalCode, setPostalCode] = useState('');
  const { data, isLoading, error } = useRepByPostalCode(postalCode);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>{data.representative.name}</h2>
      <p>{data.representative.party} - {data.representative.constituency}</p>
      {data.lookup.confidence === 'low' && (
        <Warning>This result may not be accurate</Warning>
      )}
    </div>
  );
}
```

## Troubleshooting

### "No representative found"

- Check postal code format (6 characters, no spaces)
- Try a different nearby postal code
- Rural postal codes may cover multiple ridings

### "Low confidence" result

- Postal code may be on a riding boundary
- Consider using the manual correction endpoint
- Verify with Elections Canada

### Slow response times

- First lookup may be slow (multiple API calls + verification)
- Subsequent lookups should be instant (cached)
- Contact scraping adds 1-2 seconds

## Support

For issues or questions:
- Check `HYBRID_API_MIGRATION.md` for architecture details
- Review server logs for error details
- Report issues with specific postal codes that are incorrect
