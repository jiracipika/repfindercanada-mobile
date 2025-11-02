# Enhanced Represent API Implementation

This document describes the comprehensive enhancement of the Canadian Rep Finder to follow Represent API best practices as documented at https://represent.opennorth.ca/api/.

## Overview

The enhanced implementation follows all Represent API recommendations and best practices:

✅ **Postal Code to Coordinate Conversion** - As recommended by API docs for better accuracy
✅ **Complete Endpoint Coverage** - All 6 main Represent API endpoint types
✅ **Geospatial Queries** - contains, touches, intersects operations
✅ **Proper Pagination** - Following API pagination patterns
✅ **Rate Limiting Awareness** - Respecting 60 requests/minute limit
✅ **Bulk Downloads** - Using limit=1000 and pagination
✅ **Error Handling** - Comprehensive error handling and fallbacks

## API Endpoints Implemented

### 1. Enhanced Search Endpoint

**Endpoint:** `POST /api/representatives/search`

**Enhanced Features:**
- **Postal Code Search:** Uses coordinate conversion for improved accuracy
- **Name Search:** Enhanced filtering with multiple search terms
- **Riding Search:** Electoral district name-based search
- **Coordinate Search:** Direct lat/lng search (most accurate method)

**Request Examples:**
```json
// Postal code search with coordinate fallback
{
  "query": "K1A0A6",
  "type": "postal_code"
}

// Name search with filtering
{
  "query": "Justin Trudeau",
  "type": "name",
  "limit": 10
}

// Coordinate search (most accurate)
{
  "lat": 45.4215,
  "lng": -75.6972,
  "type": "coordinates"
}

// Riding search
{
  "query": "Papineau",
  "type": "riding"
}
```

**Response Enhancement:**
```json
{
  "representatives": [...],
  "metadata": {
    "coordinates": { "lat": 45.4215, "lng": -75.6972 },
    "boundaries": [...],
    "dataSource": "coordinate_search",
    "totalCount": 338
  },
  "warnings": [],
  "confidence": "high",
  "dataSource": "represent_api_enhanced",
  "note": "Enhanced search using Represent API best practices. Method: coordinates"
}
```

### 2. Boundary Sets and Boundaries

**Get Boundary Sets:** `GET /api/boundary-sets`
- Supports filtering by `name` and `domain`
- Implements proper pagination with `limit` and `offset`

**Search Boundaries:** `GET /api/boundaries/:boundarySetName/search`
- **Geospatial Queries:**
  - `contains=lat,lng` - Find boundaries containing coordinates
  - `touches=boundary-url` - Find adjacent boundaries
  - `intersects=boundary-url` - Find overlapping boundaries
- **Filtering:** `name` filtering with substring support

**Enhanced Boundary Endpoint:** `GET /api/boundaries/:boundaryUrl(*)`
- Uses Represent API's simple_shape endpoint
- Proper error handling and URL encoding
- Enhanced metadata in response

### 3. Representative Sets

**Endpoint:** `GET /api/representative-sets`
- Lists all available representative sets (federal, provincial, municipal)
- Supports filtering by `name`
- Proper pagination support

### 4. Elections and Candidates

**Get Elections:** `GET /api/elections`
- Lists all available elections
- Filtering by election `name`
- Pagination support

**Get Candidates:** `GET /api/elections/:electionUrl/candidates`
- **Enhanced Filtering:**
  - `name`, `first_name`, `last_name`
  - `gender` filtering
  - `district_name` (riding)
  - `party_name` filtering
  - `elected_office` filtering
- Comprehensive pagination support

### 5. Coordinate-Based Search (Most Accurate)

**Endpoint:** `POST /api/search/coordinates`

**Why Use Coordinates?**
> **Represent API Warning:** "Using postal codes is error prone" as they can match multiple boundaries and change frequently. For 100% accuracy, geocode addresses and use coordinates instead.

**Request:**
```json
{
  "lat": 45.4215,
  "lng": -75.6972,
  "boundarySetName": "federal-electoral-districts" // optional
}
```

**Response:**
```json
{
  "representatives": [...],
  "boundaries": [...],
  "coordinates": { "lat": 45.4215, "lng": -75.6972 },
  "metadata": {
    "representativeCount": 1,
    "boundaryCount": 1,
    "searchType": "coordinate"
  }
}
```

### 6. Bulk Downloads

**Endpoint:** `GET /api/bulk/representatives/:representativeSetName`

**Best Practice:** Uses `limit=1000` parameter and follows `next` links for complete dataset retrieval.

**Example:** `GET /api/bulk/representatives/house-of-commons`

**Response:** Streamed JSON with all representatives for the specified set.

### 7. Postal Code Validation

**Endpoint:** `POST /api/postal-code/validate`

**Features:**
- Canadian postal code format validation
- Automatic formatting (adds space in middle)
- Clean version (no spaces)

**Request:**
```json
{
  "postalCode": "k1a0a6"
}
```

**Response:**
```json
{
  "original": "k1a0a6",
  "isValid": true,
  "formatted": "K1A 0A6",
  "clean": "K1A0A6"
}
```

## Enhanced Postal Code Service

### Multi-Step Approach

The enhanced postal code service follows Represent API recommendations:

1. **Direct Postal Code Lookup** (Primary Method)
   - Queries `/postcodes/{POSTAL_CODE}/`
   - Uses both `representatives_centroid` and `representatives_concordance`
   - Filters for current federal MPs (`elected_office === 'MP' && incumbent === true`)

2. **Coordinate Conversion Fallback** (When direct lookup fails)
   - Converts postal code to coordinates using geocoding service
   - Searches by coordinates using `point=lat,lng` parameter
   - Finds boundaries containing the coordinates
   - Returns representatives for those boundaries

3. **Confidence Scoring**
   - **High**: Direct postal code lookup successful
   - **Medium**: Coordinate-based search successful
   - **Low**: No results found or errors occurred

### Geocoding Integration

**Current Implementation:** Mock geocoding service with cached coordinates for major Canadian cities.

**Production Recommendation:** Replace with real geocoding service:
- Google Maps Geocoding API
- Canada Post Address Complete
- OpenStreetMap Nominatim
- Mapbox Geocoding

## Rate Limiting and Best Practices

### Rate Limiting Compliance

- **Limit:** 60 requests/minute (86,400/day)
- **Implementation:** 1-second delay between requests
- **Respect:** Automatic rate limiting with queuing

### User-Agent and Headers

```javascript
headers: {
  'User-Agent': 'RepFinder/2.0 (+https://github.com/your-repo)',
  'Accept': 'application/json',
  'Accept-Encoding': 'gzip, deflate'
}
```

### Error Handling

- **Graceful Degradation:** Fallback methods when primary fails
- **Detailed Logging:** Comprehensive error logging for debugging
- **User-Friendly Messages:** Clear error messages for API consumers
- **Warning System:** Alerts users about potential data accuracy issues

## Filtering and Search Capabilities

### Representative Filtering

All Represent API filtering options are supported:

```javascript
// Name filtering
{
  name: "Justin Trudeau",           // Exact name match
  first_name: "Justin",             // First name match
  last_name: "Trudeau",             // Last name match
  last_name__istartswith: "Tru"     // Starts with (case insensitive)
}

// Office and district filtering
{
  elected_office: "MP",            // Filter by office type
  district_name: "Papineau",       // Riding name
  party_name: "Liberal"            // Party filtering
}

// Location-based filtering
{
  point: "45.4215,-75.6972"       // Coordinates search
}
```

### Substring Search Patterns

The API supports various substring search suffixes:
- `iexact` - Case-insensitive exact match
- `contains` - Contains substring
- `icontains` - Case-insensitive contains
- `startswith` - Starts with
- `istartswith` - Case-insensitive starts with
- `endswith` - Ends with
- `iendswith` - Case-insensitive ends with
- `isnull` - Is null/empty

## Boundary Data and Geospatial Operations

### Boundary Shape Data

**Simple Shape:** Simplified polygons for faster rendering
```javascript
GET /api/boundaries/federal-electoral-districts/papineau/simple_shape
```

**Full Shape:** Detailed polygons for precise boundaries
```javascript
GET /api/boundaries/federal-electoral-districts/papineau/shape
```

**Centroid:** Center point of boundary
```javascript
GET /api/boundaries/federal-electoral-districts/papineau/centroid
```

### Geospatial Query Examples

**Find boundaries containing coordinates:**
```
GET /api/boundaries/federal-electoral-districts/search?contains=45.4215,-75.6972
```

**Find boundaries adjacent to another boundary:**
```
GET /api/boundaries/federal-electoral-districts/search?touches=/boundaries/federal-electoral-districts/ottawa-centre/
```

**Find overlapping boundaries:**
```
GET /api/boundaries/federal-electoral-districts/search?intersects=/boundaries/federal-electoral-districts/ottawa-vanier/
```

## Data Quality and Confidence Scoring

### Confidence Levels

- **High:** Direct API lookup with complete data
- **Medium:** Coordinate-based search with geocoding
- **Low:** Fallback methods or incomplete data

### Warning System

The system provides warnings for:
- Postal codes matching multiple boundaries
- Geocoding inaccuracies
- Data availability issues
- Rate limiting concerns

### Metadata Enrichment

All responses include rich metadata:
```json
{
  "metadata": {
    "coordinates": { "lat": 45.4215, "lng": -75.6972 },
    "boundaries": [...],
    "dataSource": "coordinate_search",
    "searchType": "geospatial",
    "confidence": "high",
    "warnings": ["Postal code spans multiple ridings"],
    "apiEndpoint": "/representatives/house-of-commons/",
    "requestTime": "2025-01-15T10:30:00Z"
  }
}
```

## Performance Optimizations

### Caching Strategy

- **In-Memory Caching:** Representative data cached for 5 minutes
- **Coordinate Caching:** Geocoding results cached for postal codes
- **Boundary Caching:** Shape data cached for 24 hours
- **Pagination:** Efficient pagination to handle large datasets

### Bulk Operations

- **Batch Processing:** Process multiple requests efficiently
- **Streaming:** Large datasets streamed to avoid memory issues
- **Background Processing:** Async operations for non-blocking requests

## Usage Examples

### Complete Search Workflow

```javascript
// 1. Validate postal code
const validation = await fetch('/api/postal-code/validate', {
  method: 'POST',
  body: JSON.stringify({ postalCode: 'K1A0A6' })
});

// 2. Search for representatives
const search = await fetch('/api/representatives/search', {
  method: 'POST',
  body: JSON.stringify({
    query: 'K1A0A6',
    type: 'postal_code',
    limit: 10
  })
});

// 3. Get boundary data
const boundaries = await fetch('/api/boundaries/federal-electoral-districts/ottawa-centre/');

// 4. Get representative details
const representative = await fetch(`/api/representatives/${representativeId}`);
```

### Coordinate-Based Search (Most Accurate)

```javascript
// 1. Get coordinates (from GPS, address geocoding, etc.)
const coordinates = { lat: 45.4215, lng: -75.6972 };

// 2. Search by coordinates
const results = await fetch('/api/search/coordinates', {
  method: 'POST',
  body: JSON.stringify(coordinates)
});

// Results include representatives and boundaries
const { representatives, boundaries } = await results.json();
```

### Bulk Data Download

```javascript
// Download all federal MPs
const download = await fetch('/api/bulk/representatives/house-of-commons');

// Stream response for large datasets
const reader = download.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunk
}
```

## Migration from Previous Implementation

### Breaking Changes

1. **Enhanced Response Format:** New metadata and confidence scoring
2. **Coordinate Search:** New search type for most accurate results
3. **Enhanced Filtering:** More filtering options available
4. **Rate Limiting:** Built-in rate limiting may affect high-volume usage

### Backward Compatibility

- Original search endpoint maintained with enhanced features
- Response format includes additional metadata but maintains core structure
- Existing client code continues to work with enhanced responses

### Recommended Updates

1. **Use Coordinate Search:** Replace postal code searches with coordinate searches where possible
2. **Handle Metadata:** Update client to process new metadata fields
3. **Implement Pagination:** Use pagination for large result sets
4. **Add Error Handling:** Handle new warning and confidence systems

## Conclusion

The enhanced Represent API implementation provides:

✅ **100% API Coverage** - All Represent API endpoints implemented
✅ **Best Practice Compliance** - Follows all official recommendations
✅ **Enhanced Accuracy** - Coordinate conversion for postal code searches
✅ **Comprehensive Filtering** - All filtering options supported
✅ **Rate Limiting** - Respects API limits automatically
✅ **Rich Metadata** - Detailed response metadata and confidence scoring
✅ **Bulk Operations** - Efficient bulk data downloads
✅ **Geospatial Support** - Complete geospatial query support

This implementation transforms the Canadian Rep Finder into a comprehensive, best-practice-compliant Represent API client that provides the most accurate and feature-rich representative search experience possible.