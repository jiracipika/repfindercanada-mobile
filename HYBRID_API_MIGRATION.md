# Hybrid API Migration Guide

## Overview

The Canadian Rep Finder app has been upgraded with a **hybrid multi-source API approach** to address data accuracy issues with the Open North Represent API, particularly for postal codes near riding boundaries.

## Problem Statement

**Previous Issues:**
- Open North Represent API had wrong/confused data for postal codes, especially between ridings
- Single point of failure if API went down
- No way to manually correct known inaccuracies
- Limited control over data freshness

## New Architecture

### Data Sources (Priority Order)

1. **Postal Code Lookups:**
   - Database cache (with manual corrections) → Represent API → House of Commons verification

2. **MP Information:**
   - House of Commons XML feed (official, always current)
   - OpenParliament.ca (for photos and detailed bios)
   - ourcommons.ca scraping (for contact details)

3. **Boundary Data:**
   - Statistics Canada WMS (official GeoJSON)
   - Fallback to Represent API if StatCan unavailable

### New Database Tables

```typescript
// Postal code cache with manual correction support
postalCodeCache {
  postalCode: string (unique)
  ridingName: string
  province: string
  source: 'cache' | 'represent_api' | 'manual_correction'
  confidence: 'high' | 'medium' | 'low'
  manualOverride: boolean
  boundaryUrl: string?
  lastVerified: timestamp
  notes: string?
}

// Official MP data from House of Commons
officialMPData {
  name: string
  ridingName: string
  province: string
  party: string
  parliamentId: string (unique)
  email: string?
  phone: string?
  constituencyOffice: jsonb
  hillOffice: jsonb
  photoUrl: string?
  profileUrl: string?
  lastScraped: timestamp
}
```

## New API Endpoints (v2)

All new endpoints are prefixed with `/api/v2/` to maintain backward compatibility.

### 1. Enhanced Postal Code Search

**Endpoint:** `POST /api/v2/representatives/postal-code`

**Request:**
```json
{
  "postalCode": "K1A0A6"
}
```

**Response:**
```json
{
  "representative": {
    "name": "John Smith",
    "party": "Liberal",
    "constituency": "Ottawa Centre",
    "province": "Ontario",
    "email": "john.smith@parl.gc.ca",
    "phone": "613-123-4567",
    "photo": "https://...",
    "offices": [
      {
        "type": "Hill",
        "address": "House of Commons, Ottawa, ON K1A 0A6",
        "phone": "613-123-4567",
        "email": "john.smith@parl.gc.ca"
      },
      {
        "type": "Constituency",
        "address": "123 Main St, Ottawa, ON K1A 1B2",
        "phone": "613-987-6543"
      }
    ],
    "parliamentId": "12345",
    "profileUrl": "https://www.ourcommons.ca/members/en/john-smith(12345)",
    "boundaryUrl": "/boundaries/federal-electoral-districts/ottawa-centre/",
    "boundary": {
      "centroid": { "lat": 45.42, "lng": -75.69 },
      "extent": [-75.8, 45.3, -75.6, 45.5]
    },
    "dataQuality": {
      "source": "represent_verified",
      "confidence": "high",
      "warnings": []
    }
  },
  "lookup": {
    "postalCode": "K1A0A6",
    "riding": "Ottawa Centre",
    "province": "Ontario",
    "source": "represent_verified",
    "confidence": "high"
  }
}
```

**Data Quality Sources:**
- `cache_manual` - Manually corrected, highest confidence
- `cache` - Previously verified via API
- `represent_verified` - From Represent API, verified with House of Commons
- `represent_unverified` - From Represent API, could not verify

### 2. Search MPs by Name

**Endpoint:** `POST /api/v2/representatives/search-name`

**Request:**
```json
{
  "name": "john"
}
```

**Response:**
```json
{
  "representatives": [
    {
      "name": "John Smith",
      "party": "Liberal",
      "constituency": "Ottawa Centre",
      "province": "Ontario",
      "email": "john.smith@parl.gc.ca",
      "parliamentId": "12345",
      "profileUrl": "https://..."
    }
  ],
  "count": 1,
  "source": "house_of_commons"
}
```

### 3. Get All Current MPs

**Endpoint:** `GET /api/v2/representatives/all`

**Response:**
```json
{
  "representatives": [...],
  "count": 338,
  "source": "house_of_commons",
  "cachedAt": "2025-01-15T12:00:00Z"
}
```

### 4. Get MP by Riding Name

**Endpoint:** `GET /api/v2/representatives/riding/:ridingName`

**Example:** `GET /api/v2/representatives/riding/Ottawa%20Centre`

### 5. Get Enhanced Boundary Data

**Endpoint:** `GET /api/v2/boundaries/:ridingName?province=ON`

Returns GeoJSON boundary data from Statistics Canada or Represent API.

### 6. Admin: Manual Postal Code Correction

**Endpoint:** `POST /api/v2/admin/postal-code-correction`

**Request:**
```json
{
  "postalCode": "K1A0A6",
  "ridingName": "Ottawa Centre",
  "province": "Ontario",
  "notes": "Near boundary with Ottawa-Vanier, verified with Elections Canada"
}
```

**Use Case:** When you discover a postal code that Represent API gets wrong, especially near riding boundaries, use this to manually correct it.

### 7. Admin: View Postal Code Cache

**Endpoint:** `GET /api/v2/admin/postal-code-cache`

Returns all cached postal code lookups with their sources and confidence levels.

### 8. Admin: Scrape MP Contact Info

**Endpoint:** `POST /api/v2/admin/scrape-mp-contact`

**Request:**
```json
{
  "profileUrl": "https://www.ourcommons.ca/members/en/john-smith(12345)"
}
```

Scrapes detailed contact information from an MP's ourcommons.ca profile page.

## Migration Strategy

### Phase 1: Parallel Operation (Current)

- Old API endpoints (`/api/representatives/...`) continue to work
- New v2 endpoints (`/api/v2/representatives/...`) available for testing
- Frontend can gradually migrate to v2 endpoints

### Phase 2: Frontend Migration

Update frontend code to use new endpoints:

```typescript
// OLD
const response = await fetch('/api/representatives/search', {
  method: 'POST',
  body: JSON.stringify({ query: postalCode, type: 'postal_code' })
});

// NEW
const response = await fetch('/api/v2/representatives/postal-code', {
  method: 'POST',
  body: JSON.stringify({ postalCode })
});
```

### Phase 3: Deprecation

Once frontend fully migrated and tested:
1. Add deprecation warnings to v1 endpoints
2. Update mobile apps to use v2
3. Eventually remove v1 endpoints (or keep for backward compatibility)

## Benefits

✅ **Improved Accuracy**: Postal codes verified against House of Commons official data
✅ **Manual Corrections**: Can fix known inaccuracies near riding boundaries
✅ **Multiple Fallbacks**: If one data source fails, others still work
✅ **Faster Response**: Database caching reduces API calls
✅ **Better Contact Info**: Scraping from official ourcommons.ca pages
✅ **Official Boundaries**: Statistics Canada WMS for authoritative boundary data
✅ **Data Provenance**: Always know where data came from and confidence level

## Caching Strategy

### Postal Code Lookups
- Cache duration: 30 days (unless manually overridden)
- Manual corrections: Never expire
- Re-verification: On stale cache hit

### House of Commons MP Data
- Cache duration: 24 hours
- Auto-refresh: On application startup
- Force refresh: Available via admin endpoint

### Contact Information
- Cache duration: 7 days
- Scraping rate limit: 1 request/second (be respectful)
- Batch scraping: Should be background job, not on-demand

### Boundary Data
- Cache duration: 30 days (boundaries rarely change)
- Source priority: StatCan WMS → Represent API

## Testing Edge Cases

Common postal code issues to test:

```typescript
// 1. Postal codes on riding boundaries
const testCases = [
  "K1A0A6", // Ottawa-Vanier/Ottawa Centre boundary
  "M5V1E9", // Toronto Centre boundary cases
  "H3B1H9", // Montreal ridings
];

// 2. Rural postal codes (sometimes cover multiple ridings)
const ruralCases = [
  "K0A1A0", // Rural Ontario
  "R0A0A0", // Rural Manitoba
];

// 3. Recently redistributed ridings
// (2013 Representation Order is current, next redistribution TBD)

// For each test case:
const result = await lookupPostalCode(testCase);
console.log(`${testCase} → ${result.ridingName} (${result.confidence}, ${result.source})`);

// If incorrect, manually correct:
await correctPostalCodeMapping(testCase, "Correct Riding Name", "Province", "Reason");
```

## Performance Considerations

### Rate Limits

**Represent API:**
- Limit: 60 requests/minute
- Strategy: Cache aggressively, use for new lookups only

**House of Commons XML:**
- No stated limit
- Strategy: Cache for 24 hours, fetch on startup

**ourcommons.ca Scraping:**
- Informal limit: Be respectful
- Strategy: 1 request/second, only scrape when needed

### Database Usage

With PostgreSQL (when implemented):
- Index `postal_code_cache.postalCode` (unique)
- Index `official_mp_data.ridingName`
- Index `official_mp_data.parliamentId` (unique)

### Background Jobs (Future Enhancement)

Consider implementing:
1. Daily MP data refresh from House of Commons
2. Weekly contact info scraping for all MPs
3. Monthly postal code cache cleanup (remove unverified old entries)

## Monitoring & Observability

Add logging for:
- Data source hits/misses (cache, Represent API, House of Commons)
- Confidence levels distribution
- Manual corrections frequency
- API response times per source

## Known Limitations

1. **Postal Code Accuracy**: Even with verification, postal codes can span multiple ridings. This is a Canada Post limitation, not an API issue.

2. **Scraping Fragility**: The ourcommons.ca scraper may break if they redesign their website. Monitor and update as needed.

3. **Data Freshness**: House of Commons XML updates within hours of changes, but cache may be up to 24 hours stale.

4. **No Senate Data**: Currently focused on House of Commons MPs only. Senate data would require additional integration.

## Future Enhancements

1. **True Database Implementation**: Move from in-memory cache to PostgreSQL
2. **Admin Dashboard**: Web UI for viewing and correcting postal code mappings
3. **Bulk Import**: Support for importing verified postal code lists
4. **Geolocation Verification**: Cross-check postal codes with lat/lng coordinates
5. **Election Updates**: Automated workflow for post-election data updates

## Support

For questions or issues with the hybrid API:
- Check this documentation
- Review code comments in `server/hybridRoutes.ts`
- Test using Postman or similar tool
- Monitor server logs for error details
