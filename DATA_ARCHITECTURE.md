# Data Architecture Overview

## Updated: Server-Side Data Fetching with House of Commons XML as Primary

### Primary Data Source (DB Primary)

**House of Commons XML Feed**
- **URL**: `https://www.ourcommons.ca/Members/en/search/xml`
- **Fetch Location**: Server-side only (NO CORS issues)
- **Data Included**:
  - MP names (first, last, full)
  - Riding names (constituencies)
  - Party affiliations
  - Province/Territory
  - Parliament IDs
  - Official email addresses
  - Photo URLs
  - Profile URLs
- **Caching**: 24-hour cache for performance
- **Implementation**: `server/houseOfCommonsService.ts`

### Secondary Data Source (Postal Code Lookup)

**Represent API (Open North)**
- **URL**: `https://represent.opennorth.ca`
- **Purpose**: Postal code → Riding name mapping
- **Fetch Location**: Server-side only (NO CORS issues)
- **Usage**:
  - Convert postal codes to riding names
  - Fallback for missing contact information
  - Office addresses and phone numbers (when available)
- **Implementation**: `server/improvedPostalCodeService.ts`

### Tertiary Data Source (Detailed Contact Info)

**Web Scraping (ourcommons.ca profiles)**
- **Purpose**: Constituency office details
- **Fetch Location**: Server-side only (NO CORS issues)
- **Data Scraped**:
  - Constituency office addresses
  - Phone numbers
  - Fax numbers
  - Additional contact details
- **Implementation**: `server/mpContactScraper.ts`

## Data Flow

### For Postal Code Searches

```
User enters postal code (e.g., "K1A 0A6")
    ↓
Server receives request at /api/representatives/search
    ↓
1. Represent API: postal code → riding name (server-side fetch)
    ↓
2. Bundled/Cached House of Commons XML: riding name → MP data (server-side)
    ↓
3. Enhance with Represent API contact info if available
    ↓
4. Return complete MP data to client
```

### For Name/Riding Searches

```
User enters name or riding (e.g., "Justin Trudeau" or "Papineau")
    ↓
Server receives request at /api/representatives/search
    ↓
1. House of Commons XML: search by name/riding (server-side)
    ↓
2. Optional: Enhance with scraped contact info
    ↓
3. Return complete MP data to client
```

## Architecture Benefits

1. **No CORS Issues**: All external API calls are made server-side
2. **Official Data**: House of Commons XML is the authoritative source
3. **Offline Capability**: Bundled XML allows app to work without internet
4. **Performance**: Multi-level caching (24hr for MP data, 7d for postal codes)
5. **Accuracy**: Represent API provides accurate postal code→riding mapping
6. **Fallback Support**: Represent API fills in missing contact information

## API Endpoints

### v1 API (Legacy - Updated to use House of Commons XML)
- `POST /api/representatives/search` - Search by postal code, name, or riding
  - **Primary source**: House of Commons XML
  - **Secondary source**: Represent API (postal code lookup only)

### v2 API (Hybrid - Recommended)
- `POST /api/v2/representatives/postal-code` - Enhanced postal code search
- `POST /api/v2/representatives/search-name` - Name search
- `GET /api/v2/representatives/all` - Get all current MPs
- `GET /api/v2/representatives/riding/:ridingName` - Get MP by riding

### v3 API (Bundled - Offline-First)
- `POST /api/v3/representatives/postal-code` - Postal code search (bundled data)
- `POST /api/v3/representatives/search-name` - Name search (bundled data)
- `GET /api/v3/representatives/all` - Get all MPs (bundled data)
- `GET /api/v3/data/info` - Get bundled data information
- `POST /api/v3/data/update` - Force check for updates

## Server-Side Guarantees

✅ **All XML/CSV fetching is SERVER-SIDE**
- House of Commons XML: Fetched by Node.js server
- Represent API: Called from Node.js server
- No client-side external API calls
- No CORS issues or browser restrictions

✅ **House of Commons XML is PRIMARY**
- All MP data comes from official House of Commons source
- Represent API only used for postal code→riding mapping
- Represent API contact info only used as fallback

✅ **Bundled Data for Offline Support**
- XML data bundled with application
- Periodic updates from House of Commons website (every 6 hours)
- App functions even without internet connection

## Implementation Files

### Core Services
- `server/houseOfCommonsService.ts` - PRIMARY: Fetches official MP data from XML
- `server/bundledDataLoader.ts` - Loads and manages bundled XML data
- `server/improvedPostalCodeService.ts` - Postal code lookup (Represent + Bundled)
- `server/hybridPostalCodeService.ts` - Advanced postal code service with verification
- `server/mpContactScraper.ts` - Web scraping for detailed contact info

### Route Handlers
- `server/routes.ts` - Main API endpoints (v1 - updated to use House of Commons XML)
- `server/hybridRoutes.ts` - Hybrid API endpoints (v2)
- `server/bundledRoutes.ts` - Bundled data endpoints (v3)

### Data Files
- `server/data/mps-bundled.xml` - Bundled House of Commons XML data

## Update History

**2025-10-27**: Updated data endpoints to use House of Commons XML as primary source
- Changed `/api/representatives/search` to use House of Commons XML for MP data
- Represent API now only used for postal code→riding mapping
- All data fetching confirmed to be server-side (no CORS)
- Added comprehensive documentation about data sources
