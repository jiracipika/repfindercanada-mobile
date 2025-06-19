# Find My Rep - Canadian Representative Finder

## Overview

Find My Rep is a web application that helps Canadian citizens find their parliamentary representatives by postal code, name, or riding. The app provides a clean, mobile-first interface for searching, viewing, and saving representative information with integration to the OpenParliament.ca API.

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

## Key Components

### Database Schema
- **Representatives Table**: Stores MP information (name, party, constituency, contact details)
- **Searches Table**: Tracks user search queries and results for analytics
- **Saved Representatives Table**: User bookmarks with simple user identification

### API Endpoints
- `GET /api/representatives/:id` - Get specific representative
- `POST /api/representatives/search` - Search by postal code, name, or riding
- `POST/DELETE /api/representatives/:id/save` - Save/unsave representatives
- `GET /api/saved/:userId` - Get user's saved representatives
- `GET /api/searches/recent` - Get recent search history

### React Components
- **SearchForm**: Handles postal code and location-based searches
- **RepresentativeCard**: Displays representative information in cards
- **RepresentativeModal**: Detailed view with contact information
- **BottomNav**: Mobile navigation with Home, Search, Saved, Profile tabs
- **Header**: App branding and navigation

### External API Integration
- **OpenParliament.ca API**: Fetches current MP data
- **Search Types**: Supports postal code, name, and riding searches
- **Data Transformation**: Converts API response to internal schema format
- **Error Handling**: Graceful fallbacks when external API is unavailable

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

## Changelog

Changelog:
- June 18, 2025. Initial setup
- June 19, 2025. Enhanced representative profiles with comprehensive contact information, office details, and authentic Canadian government API integration

## User Preferences

Preferred communication style: Simple, everyday language.