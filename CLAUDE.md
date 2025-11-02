# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canadian Rep Finder is a cross-platform mobile application (iOS and Android) built with Capacitor that helps Canadian citizens find their elected representatives by postal code, name, or riding.

**Data Architecture (Represent API Only):**
The app uses the Represent API exclusively for all Canadian federal representative data:
1. **Represent API** (https://represent.opennorth.ca/api/) - Complete data source for:
   - Postal code to riding lookups
   - Representative information (names, parties, contact details)
   - Electoral district boundaries
   - Enhanced search capabilities

The Represent API provides official Canadian government data with comprehensive coverage of all federal MPs and electoral districts.

## Development Commands

### Development Server
```bash
npm run dev
```
Starts the development server with Vite HMR on port 5000 using tsx. Sets NODE_ENV=development.

### Type Checking
```bash
npm run check
```
Runs TypeScript compiler in check mode (no emit) to verify types across the entire codebase.

### Production Build
```bash
npm run build
```
Builds both frontend (Vite) and backend (esbuild) for production. Output goes to `dist/` directory.

### Production Server
```bash
npm start
```
Runs the production build from dist/index.js with NODE_ENV=production.

### Database Migration
```bash
npm run db:push
```
Pushes schema changes to the PostgreSQL database using Drizzle Kit.

### Mobile Development
```bash
# Sync web build to native platforms
npx cap sync

# Open in native IDEs
npx cap open ios
npx cap open android

# Run on device/simulator
npx cap run ios
npx cap run android
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Mobile**: Capacitor 7 (iOS + Android native wrappers)
- **Backend**: Express.js server (serves both API and static files)
- **Database**: PostgreSQL with Drizzle ORM (schema in `shared/schema.ts`)
- **Routing**: Wouter (lightweight client-side routing)
- **UI**: Radix UI primitives + Tailwind CSS
- **State Management**: TanStack Query for server state
- **Maps**: Leaflet + react-leaflet for displaying riding boundaries

### Project Structure

```
client/src/          - React frontend application
  pages/             - Route pages (home, saved, profile, activity, etc.)
  components/        - Reusable UI components
  hooks/             - Custom React hooks including use-user-data
  lib/               - Frontend utilities and queryClient
  App.tsx            - Main app component with routing and modals

server/              - Express backend
  index.ts           - Server entry point and middleware
  routes.ts          - API route handlers
  storage.ts         - Data storage layer (MemStorage implementation)
  vite.ts            - Vite dev server integration

shared/
  schema.ts          - Database schema and Zod validation schemas

android/             - Android native project (Capacitor)
ios/                 - iOS native project (Capacitor)
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

### Key Architecture Patterns

**Hybrid Development/Production Serving**: The Express server serves the Vite dev server in development mode and static files in production. All traffic flows through port 5000.

**API Integration Strategy (Represent API Only)**: The app uses a single, comprehensive data source:

**Current API Architecture**:
1. **Represent API** (`represent.opennorth.ca`) - Complete data source for:
   - Postal code to riding lookups
   - Current MP information and photos
   - Electoral district boundaries (GeoJSON)
   - Enhanced search by name, riding, or location
   - Contact information and office details

Data flows: Postal code/name/riding → Represent API → Transform → Client
- Enhanced search capabilities support substring matching and filtering
- Direct integration with OpenParliament API for detailed MP biographies and photos
- Comprehensive boundary data with multiple GeoJSON formats (simple_shape, shape, centroid)
- Robust error handling with fallback to cached data when Represent API is unavailable

**Storage Layer**: `server/storage.ts` implements an in-memory storage (MemStorage) that can be swapped for a database implementation. Currently stores representatives, searches, and saved representatives in memory Maps.

**Mobile-First State Management**: The app uses Capacitor Preferences API for persistent storage (terms acceptance) and includes native StatusBar integration. App startup follows a strict sequence: initialize → check terms → show disclaimer → ready.

**Swipe Navigation**: Custom SwipePager component enables iOS/Android-style swipe navigation between main app sections (Home, Saved, Activity, Profile). Bottom navigation and swipes are synchronized.

**Representative Data Flow**:
1. User searches by postal code/name/riding
2. Backend queries external APIs (with caching)
3. Data is transformed and stored in MemStorage
4. Enhanced with detailed MP info (photos, offices, biography)
5. Search is logged for activity tracking
6. Results returned to frontend

**URL Handling Edge Case**: The codebase includes specific handling for URL duplication issues where `openparliament.cahttps://` can occur. These are cleaned in both routes.ts and storage.ts.

## Storage

Uses in-memory storage with Maps for data persistence:

**Storage Types:**
- **representatives**: Stores MP data (name, party, constituency, contact info, biography, offices, photo)
- **searches**: Logs search queries and results for activity tracking
- **savedRepresentatives**: User's saved MPs (many-to-many via userId)

No database required - all data is stored in memory Maps with optional client-side IndexedDB caching for offline access.

## Mobile Platform Notes

**Capacitor Configuration**:
- App ID: `com.marcelsabas.repfinderforcanada`
- Web directory: `dist/public`
- Android scheme: HTTPS
- Whitelisted domains: represent.opennorth.ca, *.gc.ca, ourcommons.ca, sencanada.ca, elections.ca

**Native Capabilities Used**:
- Geolocation (for location-based search)
- Preferences (for terms acceptance storage)
- StatusBar (for native UI integration)
- Browser (for opening external links)
- App (for version checking)

**Platform-Specific Workflows**:
- iOS: Requires Xcode, CocoaPods (`cd ios/App && pod install`)
- Android: Requires Android Studio, Gradle builds automatically

## API Integration Details

**Postal Code Search** (`POST /api/representatives/search`):
- Queries Represent API: `https://represent.opennorth.ca/postcodes/{POSTAL_CODE}/`
- Uses `representatives_centroid` or `representatives_concordance` data
- Filters for current MPs (elected_office === 'MP' && incumbent === true)
- Enhances with OpenParliament detailed info for photos and biographies
- Returns representatives with full contact information and office locations

**Name Search** (`POST /api/representatives/search` with type='name'):
- Direct Represent API name search: `?name={query}` with filtering options
- Enhanced matching for first/last name combinations
- Falls back to cached politician data when API unavailable
- Supports substring searches and multiple term matching

**Riding Search** (`POST /api/representatives/search` with type='riding'):
- Represent API boundary search: `/boundaries/federal-electoral-districts/?name={query}`
- Gets representatives for matching boundaries via related API endpoints
- Filters for current MPs and transforms data
- Fallback to cached politician data for offline functionality

**Boundary Data** (`GET /api/boundaries/:boundaryUrl(*)`):
- Fetches GeoJSON from Represent API's simple_shape endpoint
- Direct integration with Represent API boundary URLs
- Used to display riding boundaries on Leaflet maps

## Important Implementation Details

**Session Management**: The app uses express-session but currently relies on client-side userId (stored in Capacitor Preferences) rather than true authentication. This is suitable for a single-user mobile app but would need enhancement for multi-user scenarios.

**Environment-Specific Behavior**: Development uses Vite dev server with HMR. Production serves pre-built static files from dist/public. The server always binds to 0.0.0.0:5000.

**TypeScript Configuration**: Uses module: "ESNext" with bundler resolution. Type checking covers client, server, and shared directories. allowImportingTsExtensions is enabled for .ts imports.

**Terms & Privacy Flow**: On first launch or version update, users must accept privacy policy (stored in Preferences as `termsAcceptedVersion`). Non-affiliation disclaimer is shown on every launch after terms acceptance.
