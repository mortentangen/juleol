# Beer Tasting App Implementation Plan

## Overview
A web application for rating beers during tasting sessions. Users can log in, join sessions, rate beers on various criteria, and view rankings.

## Technology Stack
- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Hosting**: Vercel (Recommended)
- **Beer Data API**: Catalog.beer (Primary candidate) or manual entry

## Core Features
1.  **Authentication**
    -   Login with Google and Facebook (via Supabase Auth).
    -   User profile management.

2.  **Beer Management**
    -   Search for beers using **Sample APIs** (multiple breweries).
    -   Add new beers manually if not found.
    -   Store beer details: Name, Brewery, Style, ABV, Description, Image.

3.  **Tasting Sessions**
    -   Create a new tasting session (e.g., "Christmas 2025").
    -   Add beers to a specific session.
    -   Share session link/code for others to join.

4.  **Rating System**
    -   Rate beers on specific criteria (e.g., Appearance, Aroma, Taste, Mouthfeel, Overall).
    -   Score range: 0-5 or 0-10.
    -   Optional: Text review/notes.

5.  **Leaderboards & Analytics**
    -   **Session Overview**: Live ranking of beers in the current session.
    -   **Global Ranking**: All-time best rated beers.
    -   **User Stats**: Personal ratings history and favorites.

## Data Model (Supabase)

### `users`
- `id` (UUID, PK)
- `email`
- `full_name`
- `avatar_url`

### `beers`
- `id` (UUID, PK)
- `name`
- `brewery`
- `style`
- `abv`
- `description`
- `image_url`
- `external_id` (for API mapping)

### `sessions`
- `id` (UUID, PK)
- `name`
- `date`
- `host_id` (FK to users)
- `is_active` (boolean)

### `session_beers`
- `session_id` (FK)
- `beer_id` (FK)
- `order` (Sorting order in the tasting)

### `ratings`
- `id` (UUID, PK)
- `user_id` (FK)
- `beer_id` (FK)
- `session_id` (FK)
- `appearance` (int)
- `aroma` (int)
- `taste` (int)
- `mouthfeel` (int)
- `overall` (int)
- `comment` (text)
- `created_at`

## Implementation Steps

### Phase 1: Setup & Auth
1.  Initialize React + Vite + Tailwind project.
2.  Set up Supabase project.
3.  Configure Supabase Auth (Google/Facebook providers).
4.  Create basic layout and login page.

### Phase 2: Beer & Session Management
1.  Create Database Schema in Supabase.
2.  Implement "Create Session" flow.
3.  Implement "Add Beer" flow (Search API + Save to DB).
4.  List beers in a session.

### Phase 3: Rating System
1.  Create Rating UI (Stars/Sliders for criteria).
2.  Submit ratings to Supabase.
3.  Prevent duplicate ratings for the same beer/session/user.

### Phase 4: Dashboards
1.  Build Session Leaderboard (Average scores).
2.  Build User Profile (My Ratings).
3.  Polish UI/UX with Tailwind.

## External API Integration
- **Sample APIs Beer Database**: Free beer database with multiple breweries
    -   No authentication required
    -   Search across ales, stouts, and lagers
    -   Returns: Name, Style, Rating, Image
- **Fallback**: Manual entry form for Name, Brewery, ABV, etc.
