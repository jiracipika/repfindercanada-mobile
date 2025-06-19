# Find My Rep - Canadian Representative Finder

## Overview

Find My Rep is a comprehensive mobile-first web application that helps Canadian citizens discover, contact, and engage with their parliamentary representatives. The app provides authentic government data through real-time API integration, featuring interactive maps, direct communication tools, and social media sharing capabilities for seamless civic engagement.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Build Tool**: Vite for fast development and optimized production builds
- **Mobile-First**: Responsive design optimized for mobile devices

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js server
- **Language**: TypeScript with ES modules
- **API**: RESTful API design with JSON responses
- **Database**: PostgreSQL with Drizzle ORM
- **External API**: OpenParliament.ca for representative data
- **Storage**: Dual storage system (in-memory for development, PostgreSQL for production)

### Data Storage Solutions
- **Primary Database**: PostgreSQL 16 via Neon Database serverless
- **ORM**: Drizzle ORM with TypeScript schema definitions
- **Session Storage**: PostgreSQL-based sessions with connect-pg-simple
- **Schema**: Three main tables - representatives, searches, saved_representatives
- **Migrations**: Drizzle Kit for schema management

## Core Features & Functionality

### Search & Discovery
- **Smart Search**: Multi-type search supporting postal codes (M1K4K6), MP names, and riding names
- **Location-Based**: Automatic geolocation detection with reverse geocoding
- **Real-Time Results**: Live search with instant representative matching
- **Recent Search History**: Persistent search tracking for quick re-access

### Representative Profiles
- **Authentic Photos**: High-resolution MP portraits from OpenParliament.ca
- **Complete Contact Information**: Legislature and constituency office details
- **Interactive Contact Methods**: 
  - Clickable phone numbers opening device dialer
  - Clickable email addresses opening mail client
  - Direct website links to official MP pages
- **Political Information**: Party affiliation, constituency, province details
- **Biography Section**: Role descriptions and tenure information

### Interactive Features
- **Interactive Maps**: 
  - Visual map placeholder with location indicators
  - Google Maps integration showing both Legislature (Ottawa) and constituency offices
  - "View Both Offices" button opening directions between locations
  - Individual office location buttons
- **Social Media Sharing**:
  - Native device sharing API integration
  - Comprehensive contact information sharing
  - Fallback clipboard copying for unsupported devices
  - Formatted text including all phone numbers and email addresses

### User Experience
- **Mobile-First Design**: Optimized for smartphones and tablets
- **Bottom Navigation**: Home, Search, Saved, Profile sections
- **Modal-Based Profiles**: Full-screen representative details
- **Save Functionality**: Bookmark favorite representatives
- **Dark/Light Mode**: Theme switching support

## Database Schema
- **Representatives Table**: MP information (name, party, constituency, contact details, photos, websites)
- **Searches Table**: User search history with query tracking
- **Saved Representatives Table**: User bookmarks with relationship mapping

## API Architecture

### Internal API Endpoints
- `GET /api/representatives/:id` - Retrieve specific representative
- `POST /api/representatives/search` - Multi-type search (postal code, name, riding)
- `POST/DELETE /api/representatives/:id/save` - Save/unsave representatives
- `GET /api/saved/:userId` - Retrieve user's saved representatives
- `GET /api/searches/recent` - Get recent search history

### External API Integration
- **OpenParliament.ca API**: 
  - Primary data source for current MP information
  - Endpoints: `/api/politicians/`, `/api/politicians/search/`
  - Real-time data fetching with detailed MP profiles
  - High-resolution photo retrieval from `/media/polpics/`
  - Comprehensive biographical and contact information

### Data Flow & Processing
- **Search Processing**: Postal code → Represent API → riding identification → MP lookup
- **Data Transformation**: OpenParliament API responses → internal schema format
- **Image URL Handling**: Proper URL construction preventing duplication
- **Error Handling**: Graceful fallbacks for API unavailability

## React Components Architecture

### Core Components
- **SearchForm**: Multi-type search input with validation and location detection
- **RepresentativeCard**: Compact representative display with photo and basic info
- **RepresentativeModal**: Comprehensive profile view with all contact methods
- **BottomNav**: Mobile navigation with active state indicators
- **Header**: App branding and search integration

### UI Component Library
- **shadcn/ui**: Complete component system built on Radix UI primitives
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Lucide React**: Icon system for consistent visual language
- **Responsive Design**: Mobile-first with tablet and desktop adaptations

## Data Flow

1. **Search Flow**: User enters search query → API calls OpenParliament.ca → Results transformed and cached → Displayed in UI
2. **Save Flow**: User saves representative → Stored in saved_representatives table → Available in saved section
3. **Profile Flow**: User activity tracked through searches and saves → Displayed in profile stats

## External Dependencies

### Production Dependencies
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `connect-pg-simple`
- **UI Components**: Complete shadcn/ui component library with Radix UI primitives
- **State Management**: `@tanstack/react-query` for server state
- **Forms**: `react-hook-form` with `@hookform/resolvers`
- **Utilities**: `date-fns`, `clsx`, `class-variance-authority`

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full TypeScript setup with strict configuration
- **Replit Integration**: Custom Vite plugins for Replit environment

## Deployment Strategy

### Replit Configuration
- **Environment**: Node.js 20, Web, PostgreSQL 16 modules
- **Development**: `npm run dev` starts both frontend and backend
- **Production Build**: Vite builds client, esbuild bundles server
- **Deployment**: Autoscale deployment target with build/run commands
- **Port Configuration**: Internal port 5000, external port 80

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Development/production environment flag

### File Structure
```
├── client/          # React frontend application
├── server/          # Express backend server
├── shared/          # Shared TypeScript schemas and types
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Technical Implementation Details

### Contact Functionality
- **Phone Integration**: `tel:` protocol links with cleaned phone number formatting
- **Email Integration**: `mailto:` protocol with fallback email generation using MP name patterns
- **Click Handlers**: JavaScript functions using `window.open()` for device app integration
- **Contact Methods**: Both Legislature (Ottawa) and Constituency office phone numbers

### Map Integration
- **Google Maps**: Deep linking to show office locations and directions
- **Interactive Elements**: Visual map placeholder with location indicators
- **Dual Office Display**: Combined view showing both Legislature and Constituency offices
- **Responsive Design**: Mobile-optimized map viewing experience

### Sharing Capabilities
- **Native Sharing API**: Device-native sharing when available (mobile devices)
- **Fallback Methods**: Clipboard copying for desktop and unsupported devices
- **Formatted Content**: Complete contact information including all phone numbers and email
- **Social Media Ready**: Pre-formatted text for Twitter, Facebook, WhatsApp sharing

### Data Sources & APIs
- **OpenParliament.ca**: `https://openparliament.ca/api/politicians/` for MP data
- **Represent API**: For postal code to riding mapping (planned integration)
- **Photo URLs**: `https://openparliament.ca/media/polpics/` for high-resolution MP photos
- **Real-time Data**: Live API calls ensuring current MP information

### Performance & Reliability
- **Error Handling**: Graceful degradation when APIs are unavailable
- **Caching Strategy**: In-memory storage for development, PostgreSQL for production
- **Mobile Optimization**: Touch-friendly interfaces with large clickable areas
- **Progressive Enhancement**: Core functionality works without JavaScript

## Changelog

- June 18, 2025: Initial application setup with basic search functionality
- June 19, 2025: Enhanced representative profiles with comprehensive contact information and authentic API integration
- June 19, 2025: Implemented interactive contact features (clickable phone/email), map integration, and social media sharing capabilities

## User Preferences

Preferred communication style: Simple, everyday language with detailed technical documentation for future reference.