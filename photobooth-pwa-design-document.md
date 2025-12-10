# Photo Booth PWA — Design Document

**Project:** Haven & Hayden Wedding Photo Booth  
**Domain:** photobooth.meekthenilands.com  
**Event Date:** December 31, 2025 (New Year's Eve)  
**Document Version:** 1.0  
**Last Updated:** December 2024

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Personas & Access Levels](#2-user-personas--access-levels)
3. [Core User Flows](#3-core-user-flows)
4. [Data Models](#4-data-models)
5. [API Specification](#5-api-specification)
6. [Technical Architecture](#6-technical-architecture)
7. [Tech Stack](#7-tech-stack)
8. [Design System & Theming](#8-design-system--theming)
9. [PWA Features](#9-pwa-features)
10. [Image Processing Pipeline](#10-image-processing-pipeline)
11. [Photo Strip Layouts](#11-photo-strip-layouts)
12. [Audio & Visual Feedback](#12-audio--visual-feedback)
13. [Configuration Options](#13-configuration-options)
14. [URL Structure](#14-url-structure)
15. [Email System](#15-email-system)
16. [Security Considerations](#16-security-considerations)
17. [Offline Behavior](#17-offline-behavior)
18. [Project Phases & Checklist](#18-project-phases--checklist)
19. [Future Enhancements](#19-future-enhancements)

---

## 1. Project Overview

### Purpose

A Progressive Web App (PWA) photo booth for Haven & Hayden's New Year's Eve 2025 wedding. Guests can capture single photos or multi-shot sequences (classic photo booth style), with automatic cloud backup and optional email delivery.

### Key Features

- **Single photo mode** — Quick capture with countdown
- **Photo booth mode** — 2-10 sequential photos with configurable timing
- **Photo strip generation** — Classic vertical strip layout for multi-shot sessions
- **Personal galleries** — Each guest gets a unique link to their photos
- **Communal gallery** — Admin access to all photos from all guests
- **Offline resilience** — Photos queue locally and sync when connection returns
- **Multi-device support** — Works on dedicated tablet and guest phones simultaneously
- **Email delivery** — Optional email with photos attached

### Deployment

- **Primary:** Self-hosted on Proxmox via Docker Compose
- **Fallback:** Railway (if stress testing reveals issues)
- **Access:** Cloudflare Tunnel for HTTPS

---

## 2. User Personas & Access Levels

| Role | Access | Identification |
|------|--------|----------------|
| **Guest** | Own photos only, personal gallery link | Name + last initial + device fingerprint |
| **Admin** | All photos, all guests, configuration panel | Password-protected dashboard |

### Guest Identification Strategy

When a guest opens the app for the first time:

1. Prompt for **first name**
2. Prompt for **last initial** (to handle duplicates like "Sarah M" vs "Sarah T")
3. Generate URL-safe slug: `sarah-m`, `sarah-t`
4. Store in localStorage + sync to server with device fingerprint
5. If exact slug exists from different device, prompt: "Is this the same [Name] from earlier, or someone new?"

---

## 3. Core User Flows

### Flow 1: First-Time Guest Setup

```
Open App (/)
    ↓
Name Entry Screen
    - "What's your first name?"
    - "What's your last initial?"
    - Optional: "Email (to receive your photos)"
    ↓
Confirmation: "Hi, Sarah M! 👋"
    ↓
Main Menu (/booth)
```

### Flow 2: Returning Guest

```
Open App (/)
    ↓
[localStorage has user data]
    ↓
Main Menu (/booth) — "Welcome back, Sarah!"
```

### Flow 3: Single Photo Capture

```
Main Menu
    ↓
Tap "Single Photo"
    ↓
Viewfinder (mirrored, fullscreen)
    ↓
Tap "Capture" button
    ↓
[3 second countdown with beeps]
    ↓
[Flash effect + shutter sound]
    ↓
Preview screen
    ├─ [Retake] → Back to viewfinder
    └─ [Save] → "Saved! ✨" + return to menu
```

### Flow 4: Photo Booth Mode (Multi-Shot)

```
Main Menu
    ↓
Tap "Photo Booth"
    ↓
Configuration screen:
    - Photo count slider (2-10, default 4)
    - Initial countdown (1-10s, default 3s)
    - Between-shot delay (0.5-5s, default 1s)
    ↓
Tap "Start"
    ↓
[3s initial countdown with beeps]
    ↓
[Flash + shutter] → Capture #1
    ↓
[1s delay]
    ↓
[Flash + shutter] → Capture #2
    ↓
... repeat for selected count ...
    ↓
Preview screen showing:
    - Grid of individual photos
    - Generated photo strip
    ↓
├─ [Retake All] → Back to viewfinder (settings preserved)
└─ [Save] → "Saved! ✨" + return to menu
```

### Flow 5: View My Photos

```
Main Menu
    ↓
Tap "My Photos"
    ↓
Grid gallery of thumbnails
    - Individual photos
    - Photo strips (marked with icon)
    ↓
Tap any photo → Fullscreen view
    ↓
Options:
    - Download
    - Share link
    - Re-send email (if email on file)
```

### Flow 6: Admin Dashboard

```
Navigate to /admin
    ↓
Password prompt
    ↓
Admin Dashboard:
    ├─ Guest list (with photo counts)
    ├─ All photos grid (filterable by guest, date)
    ├─ Bulk download (ZIP)
    ├─ Configuration panel
    └─ Storage status
```

---

## 4. Data Models

### User

```typescript
interface User {
  id: string;              // UUID, primary key
  name: string;            // Display name (e.g., "Sarah M")
  slug: string;            // URL-safe unique identifier (e.g., "sarah-m")
  email: string | null;    // Optional email for delivery
  device_fingerprint: string;
  created_at: string;      // ISO timestamp
  last_active: string;     // ISO timestamp
}
```

### Photo

```typescript
interface Photo {
  id: string;              // UUID, primary key
  user_id: string;         // Foreign key → User
  session_id: string | null; // Foreign key → Session (null for single photos)
  filename_original: string; // Path to full-resolution file
  filename_web: string;    // Path to compressed web version
  filename_thumb: string;  // Path to thumbnail
  captured_at: string;     // ISO timestamp (client-side capture time)
  uploaded_at: string | null; // ISO timestamp (null if pending sync)
  is_synced: boolean;      // false if in offline queue
  sequence_number: number | null; // Position in multi-shot session
}
```

### Session (Multi-Shot Grouping)

```typescript
interface Session {
  id: string;              // UUID, primary key
  user_id: string;         // Foreign key → User
  photo_count: number;     // Number of photos in session
  strip_filename: string | null; // Path to generated strip image
  settings: SessionSettings;
  created_at: string;      // ISO timestamp
}

interface SessionSettings {
  initial_countdown: number;  // seconds
  between_delay: number;      // seconds
}
```

### Config (Admin-Adjustable)

```typescript
interface Config {
  key: string;             // Primary key
  value: any;              // JSON value
}

// Example config keys:
// - countdown_initial: 3
// - countdown_between: 1
// - max_photos: 10
// - mirror_preview: true
// - overlay_enabled: false
// - email_auto_send: false
```

### SQLite Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT,
  device_fingerprint TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_active TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  photo_count INTEGER NOT NULL,
  strip_filename TEXT,
  settings TEXT NOT NULL, -- JSON
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT REFERENCES sessions(id),
  filename_original TEXT NOT NULL,
  filename_web TEXT NOT NULL,
  filename_thumb TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  uploaded_at TEXT,
  is_synced INTEGER DEFAULT 0,
  sequence_number INTEGER
);

CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON
);

CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_session ON photos(session_id);
CREATE INDEX idx_users_slug ON users(slug);
```

---

## 5. API Specification

### Base URL

```
https://photobooth.meekthenilands.com/api
```

### Guest Endpoints

#### Create or Lookup User

```
POST /users
```

**Request Body:**
```json
{
  "name": "Sarah",
  "last_initial": "M",
  "email": "sarah@example.com",  // optional
  "device_fingerprint": "abc123..."
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "name": "Sarah M",
  "slug": "sarah-m",
  "email": "sarah@example.com",
  "is_new": true
}
```

**Response (409 Conflict - slug exists from different device):**
```json
{
  "error": "slug_exists",
  "existing_name": "Sarah M",
  "suggestion": "sarah-m-2"
}
```

---

#### Get User Info

```
GET /users/:slug
```

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "name": "Sarah M",
  "slug": "sarah-m",
  "photo_count": 12,
  "session_count": 3
}
```

---

#### Upload Photos

```
POST /photos
Content-Type: multipart/form-data
```

**Form Fields:**
- `user_id` (required): UUID
- `session_id` (optional): UUID for multi-shot sessions
- `photos[]` (required): One or more image files
- `captured_at[]` (required): ISO timestamp for each photo
- `sequence_numbers[]` (optional): Position in sequence for each photo

**Response (201 Created):**
```json
{
  "photos": [
    {
      "id": "photo-uuid",
      "filename_web": "/photos/sarah-m/web/photo-uuid.jpg",
      "filename_thumb": "/photos/sarah-m/thumb/photo-uuid.jpg"
    }
  ],
  "session": {
    "id": "session-uuid",
    "strip_filename": "/photos/sarah-m/strips/session-uuid.jpg"
  }
}
```

---

#### Get User's Photos

```
GET /users/:slug/photos
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `per_page` (optional): Items per page, default 50

**Response (200 OK):**
```json
{
  "photos": [
    {
      "id": "photo-uuid",
      "filename_web": "/photos/sarah-m/web/photo-uuid.jpg",
      "filename_thumb": "/photos/sarah-m/thumb/photo-uuid.jpg",
      "captured_at": "2025-12-31T20:15:00Z",
      "session_id": null
    }
  ],
  "sessions": [
    {
      "id": "session-uuid",
      "photo_count": 4,
      "strip_filename": "/photos/sarah-m/strips/session-uuid.jpg",
      "created_at": "2025-12-31T21:30:00Z",
      "photos": ["photo-uuid-1", "photo-uuid-2", "photo-uuid-3", "photo-uuid-4"]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 12
  }
}
```

---

#### Trigger Email Send

```
POST /users/:slug/send-email
```

**Request Body:**
```json
{
  "photo_ids": ["uuid1", "uuid2"],  // optional, sends all if omitted
  "session_ids": ["session-uuid"]   // optional, includes strips
}
```

**Response (200 OK):**
```json
{
  "sent": true,
  "email": "sarah@example.com"
}
```

---

#### Create Session (for multi-shot)

```
POST /sessions
```

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "photo_count": 4,
  "settings": {
    "initial_countdown": 3,
    "between_delay": 1
  }
}
```

**Response (201 Created):**
```json
{
  "id": "session-uuid",
  "user_id": "user-uuid",
  "photo_count": 4
}
```

---

### Admin Endpoints

All admin endpoints require `Authorization: Bearer <admin_password>` header.

#### List All Users

```
GET /admin/users
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Sarah M",
      "slug": "sarah-m",
      "email": "sarah@example.com",
      "photo_count": 12,
      "session_count": 3,
      "last_active": "2025-12-31T22:00:00Z"
    }
  ]
}
```

---

#### List All Photos

```
GET /admin/photos
```

**Query Parameters:**
- `user_id` (optional): Filter by user
- `page`, `per_page`: Pagination

---

#### Bulk Download

```
GET /admin/photos/download
```

**Query Parameters:**
- `user_id` (optional): Filter by user
- `format`: `zip` (default)
- `quality`: `original` | `web`

**Response:** ZIP file download

---

#### Get Config

```
GET /admin/config
```

**Response (200 OK):**
```json
{
  "countdown_initial": 3,
  "countdown_between": 1,
  "max_photos": 10,
  "mirror_preview": true,
  "overlay_enabled": false,
  "email_auto_send": false
}
```

---

#### Update Config

```
PATCH /admin/config
```

**Request Body:**
```json
{
  "countdown_initial": 5,
  "mirror_preview": false
}
```

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           GUEST DEVICES                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Tablet     │  │   Phone 1    │  │   Phone 2    │    ...       │
│  │   (PWA)      │  │   (PWA)      │  │   (PWA)      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         │    [IndexedDB queue if offline]   │                       │
│         │                 │                 │                       │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          └────────────────┬┴─────────────────┘
                           │
                           │ HTTPS (Cloudflare Tunnel)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        PROXMOX SERVER                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Cloudflare Tunnel (cloudflared)             │  │
│  │                    photobooth.meekthenilands.com               │  │
│  └─────────────────────────────┬──────────────────────────────────┘  │
│                                │                                     │
│  ┌─────────────────────────────┼──────────────────────────────────┐  │
│  │                      Docker Compose                            │  │
│  │                                                                │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                      │  │
│  │  │     Nginx       │  │    Node.js      │                      │  │
│  │  │   (reverse      │──│    (Fastify)    │                      │  │
│  │  │    proxy)       │  │                 │                      │  │
│  │  │                 │  │  ┌───────────┐  │                      │  │
│  │  │  - SSL term     │  │  │   Sharp   │  │                      │  │
│  │  │  - Static files │  │  │  (image   │  │                      │  │
│  │  │  - Gzip         │  │  │ processing│  │                      │  │
│  │  └─────────────────┘  │  └───────────┘  │                      │  │
│  │                       │                 │                      │  │
│  │                       │  ┌───────────┐  │  ┌────────────────┐  │  │
│  │                       │  │  SQLite   │  │  │   Photo        │  │  │
│  │                       │  │   (DB)    │  │  │   Storage      │  │  │
│  │                       │  └───────────┘  │  │   /data/photos │  │  │
│  │                       │                 │  └────────────────┘  │  │
│  │                       └─────────────────┘                      │  │
│  │                                │                               │  │
│  │                                │ SMTP                          │  │
│  │                                ▼                               │  │
│  │                       ┌─────────────────┐                      │  │
│  │                       │ Google Workspace│                      │  │
│  │                       │     SMTP        │                      │  │
│  │                       │ (Nodemailer)    │                      │  │
│  │                       └─────────────────┘                      │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Directory Structure (Server)

```
/opt/photobooth/
├── docker-compose.yml
├── .env
├── nginx/
│   └── nginx.conf
├── app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Fastify entry point
│   │   ├── routes/
│   │   │   ├── users.ts
│   │   │   ├── photos.ts
│   │   │   ├── sessions.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── database.ts   # SQLite connection
│   │   │   ├── storage.ts    # File management
│   │   │   ├── imaging.ts    # Sharp processing
│   │   │   ├── strips.ts     # Photo strip generation
│   │   │   └── email.ts      # Nodemailer
│   │   └── utils/
│   │       └── slug.ts       # URL-safe slug generation
│   └── dist/                 # Compiled JS
├── frontend/
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   ├── src/
│   │   ├── app.html
│   │   ├── app.css
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte          # Name entry / landing
│   │   │   ├── booth/
│   │   │   │   └── +page.svelte      # Main capture interface
│   │   │   ├── gallery/
│   │   │   │   └── [slug]/
│   │   │   │       └── +page.svelte  # Personal gallery
│   │   │   └── admin/
│   │   │       ├── +page.svelte      # Admin dashboard
│   │   │       └── +layout.svelte    # Admin auth wrapper
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── Camera.svelte
│   │   │   │   ├── Countdown.svelte
│   │   │   │   ├── PhotoPreview.svelte
│   │   │   │   ├── PhotoStrip.svelte
│   │   │   │   ├── Gallery.svelte
│   │   │   │   └── StarryBackground.svelte
│   │   │   ├── stores/
│   │   │   │   ├── user.ts
│   │   │   │   ├── photos.ts
│   │   │   │   └── config.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── camera.ts
│   │   │   │   ├── offline.ts        # IndexedDB queue
│   │   │   │   └── audio.ts
│   │   │   └── utils/
│   │   │       └── fingerprint.ts
│   │   └── service-worker.ts
│   ├── static/
│   │   ├── manifest.json
│   │   ├── sounds/
│   │   │   ├── beep.mp3
│   │   │   └── shutter.mp3
│   │   └── icons/
│   └── build/                        # Production build
└── data/
    ├── photobooth.db                 # SQLite database
    └── photos/
        ├── [slug]/
        │   ├── original/
        │   ├── web/
        │   ├── thumb/
        │   └── strips/
        └── ...
```

---

## 7. Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | SvelteKit | Lightweight, excellent PWA support, reactive |
| **Styling** | Tailwind CSS | Rapid development, familiar tooling |
| **Backend** | Node.js + Fastify | Fast, TypeScript support, minimal overhead |
| **Database** | SQLite (better-sqlite3) | Simple, sufficient for expected load, no separate service |
| **Image Processing** | Sharp | Fast, native Node.js bindings |
| **Email** | Nodemailer + Google Workspace SMTP | Reliable, uses existing infrastructure |
| **Storage** | Local filesystem | Simple, fast on SSD |
| **Containerization** | Docker Compose | Consistent deployment, matches existing setup |
| **Reverse Proxy** | Nginx | Static file serving, compression |
| **Tunnel** | Cloudflare Tunnel | HTTPS, DDoS protection, already in use |

### Key Dependencies

**Backend (package.json):**
```json
{
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/cors": "^8.x",
    "@fastify/multipart": "^8.x",
    "@fastify/static": "^7.x",
    "better-sqlite3": "^9.x",
    "sharp": "^0.33.x",
    "nodemailer": "^6.x",
    "uuid": "^9.x",
    "archiver": "^6.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/better-sqlite3": "^7.x"
  }
}
```

**Frontend (package.json):**
```json
{
  "dependencies": {
    "@sveltejs/kit": "^2.x",
    "svelte": "^4.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.17.x"
  }
}
```

---

## 8. Design System & Theming

### Color Palette

Derived from meekthenilands.com wedding homepage:

```css
:root {
  /* Background gradient */
  --bg-gradient: linear-gradient(to top, #000814 0%, #001233 15%, #000000 100%);
  
  /* Primary colors */
  --color-white: #ffffff;
  --color-white-90: #f0f0f0;
  --color-white-80: #e0e0e0;
  --color-white-70: #d0d0d0;
  --color-gray: #808080;
  
  /* Surfaces */
  --surface-card: rgba(20, 20, 20, 0.15);
  --surface-card-hover: rgba(255, 255, 255, 0.25);
  --border-subtle: rgba(255, 255, 255, 0.2);
  --border-medium: rgba(255, 255, 255, 0.5);
  
  /* Shadows */
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-button-hover: 0 4px 12px rgba(255, 255, 255, 0.2);
  
  /* Blur */
  --blur-card: blur(3px);
}
```

### Typography

```css
/* Import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');

:root {
  --font-display: 'Great Vibes', cursive;      /* Main headings */
  --font-script: 'Pinyon Script', cursive;     /* Subtitles, accents */
  --font-body: 'Playfair Display', serif;      /* Body text */
}

/* Type scale */
.text-display    { font-family: var(--font-display); font-size: 3.5rem; }
.text-script     { font-family: var(--font-script); font-size: 2rem; }
.text-heading    { font-family: var(--font-body); font-size: 1.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
.text-body       { font-family: var(--font-body); font-size: 1rem; }
.text-label      { font-family: var(--font-body); font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
```

### Decorative Elements

```css
/* Diamond ornament */
.ornament {
  display: inline-block;
  margin: 0 10px;
  color: var(--color-gray);
}
.ornament::before { content: '◆'; }

/* Sparkle animation */
.sparkle {
  display: inline-block;
  animation: sparkle 2s linear infinite;
}
@keyframes sparkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Animated Starry Background

Port directly from wedding homepage:

```svelte
<!-- StarryBackground.svelte -->
<script>
  import { onMount } from 'svelte';
  
  let starsContainer;
  
  onMount(() => {
    // Create twinkling stars
    const createTwinklingStar = () => {
      const star = document.createElement('div');
      star.className = 'twinkling-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 5 + 's';
      star.style.animationDuration = (2 + Math.random() * 3) + 's';
      starsContainer.appendChild(star);
      setTimeout(() => star.remove(), 5000);
    };
    
    // Initial batch
    for (let i = 0; i < 20; i++) {
      setTimeout(createTwinklingStar, i * 100);
    }
    
    // Continuous creation
    const interval = setInterval(createTwinklingStar, 300);
    return () => clearInterval(interval);
  });
</script>

<div class="stars-wrapper" bind:this={starsContainer}>
  <div class="stars"></div>
  <div class="stars2"></div>
</div>

<style>
  .stars-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }
  
  .stars, .stars2 {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .stars {
    background: transparent;
    animation: animateStars 100s linear infinite;
  }
  
  .stars::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      radial-gradient(2px 2px at 20% 30%, white, transparent),
      radial-gradient(2px 2px at 40% 70%, white, transparent),
      radial-gradient(1px 1px at 60% 50%, white, transparent),
      radial-gradient(1px 1px at 80% 10%, white, transparent),
      radial-gradient(2px 2px at 90% 60%, white, transparent);
    background-size: 300px 300px;
    background-repeat: repeat;
    opacity: 0.8;
  }
  
  .stars2 {
    animation: animateStars 150s linear infinite;
    opacity: 0.5;
  }
  
  .stars2::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
      radial-gradient(1px 1px at 10% 20%, white, transparent),
      radial-gradient(1px 1px at 30% 40%, white, transparent),
      radial-gradient(2px 2px at 50% 60%, white, transparent);
    background-size: 400px 400px;
    background-repeat: repeat;
  }
  
  @keyframes animateStars {
    from { transform: translateY(0); }
    to { transform: translateY(-100%); }
  }
  
  :global(.twinkling-star) {
    position: fixed;
    width: 2px;
    height: 2px;
    background-color: #fff;
    border-radius: 50%;
    pointer-events: none;
    animation: twinkle linear infinite;
    box-shadow: 0 0 4px rgba(255,255,255,0.5);
  }
  
  @keyframes twinkle {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
</style>
```

### Card Component

```css
.card {
  background: var(--surface-card);
  border: 2px solid var(--border-subtle);
  border-radius: 15px;
  padding: 40px;
  backdrop-filter: var(--blur-card);
  box-shadow: var(--shadow-card);
  animation: slideUp 1s ease-out both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Button Styles

```css
.btn {
  display: inline-block;
  padding: 12px 24px;
  background: var(--surface-card);
  border: 2px solid var(--border-medium);
  border-radius: 8px;
  color: var(--color-white);
  font-family: var(--font-body);
  font-size: 1.1rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn:hover {
  background: var(--surface-card-hover);
  border-color: var(--color-white);
  transform: translateY(-2px);
  box-shadow: var(--shadow-button-hover);
}

.btn-primary {
  background: rgba(255, 255, 255, 0.2);
}

.btn-large {
  padding: 20px 40px;
  font-size: 1.3rem;
}

.btn-capture {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 0;
  border-width: 4px;
}
```

### Link Styles

```css
.link {
  color: var(--color-white);
  text-decoration: none;
  border-bottom: 1px dotted var(--color-white);
  transition: all 0.3s ease;
}

.link:hover {
  color: #c0c0c0;
  border-bottom-color: #c0c0c0;
}
```

### Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'wedding-dark': '#000814',
        'wedding-navy': '#001233',
        'wedding-gray': '#808080',
      },
      fontFamily: {
        'display': ['Great Vibes', 'cursive'],
        'script': ['Pinyon Script', 'cursive'],
        'body': ['Playfair Display', 'serif'],
      },
      animation: {
        'sparkle': 'sparkle 2s linear infinite',
        'stars': 'animateStars 100s linear infinite',
        'stars-slow': 'animateStars 150s linear infinite',
        'twinkle': 'twinkle 3s linear infinite',
        'slide-up': 'slideUp 1s ease-out both',
        'fade-in': 'fadeIn 1.5s ease-in',
      },
      keyframes: {
        sparkle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        animateStars: {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(-100%)' },
        },
        twinkle: {
          '0%, 100%': { opacity: 0 },
          '50%': { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(30px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
      backdropBlur: {
        'card': '3px',
      },
    },
  },
};
```

---

## 9. PWA Features

### Service Worker Responsibilities

1. **Cache app shell** — HTML, CSS, JS, fonts, icons
2. **Cache sounds** — Preload beep.mp3 and shutter.mp3
3. **Queue failed uploads** — Store in IndexedDB when offline
4. **Background sync** — Retry uploads when connection restored
5. **Offline UI** — Show indicator, allow photo capture to continue

### Web App Manifest

```json
{
  "name": "Haven & Hayden Photo Booth",
  "short_name": "Photo Booth",
  "description": "Capture memories at Haven & Hayden's wedding",
  "start_url": "/",
  "display": "fullscreen",
  "orientation": "portrait",
  "theme_color": "#000814",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### IndexedDB Schema (Offline Queue)

```typescript
interface OfflinePhoto {
  id: string;           // Local UUID
  user_id: string;
  session_id: string | null;
  blob: Blob;           // Full-resolution image
  captured_at: string;
  sequence_number: number | null;
  retry_count: number;
  created_at: string;
}

// IndexedDB store: 'offline_photos'
// Index on: created_at (for FIFO processing)
```

### Sync Logic

```typescript
// On app start and on 'online' event:
async function syncOfflinePhotos() {
  const db = await openDB('photobooth', 1);
  const photos = await db.getAll('offline_photos');
  
  for (const photo of photos) {
    try {
      await uploadPhoto(photo);
      await db.delete('offline_photos', photo.id);
    } catch (err) {
      photo.retry_count++;
      if (photo.retry_count < 5) {
        await db.put('offline_photos', photo);
      }
      // Stop on first failure, retry later
      break;
    }
  }
}
```

---

## 10. Image Processing Pipeline

### Client-Side (Capture)

```
┌─────────────────────────────────────────────────────────────────┐
│                     getUserMedia()                              │
│                     (front camera)                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    <video> element                              │
│                    (mirrored via CSS)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │ [Capture button pressed]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   <canvas> capture                              │
│   - Draw video frame (mirrored via transform)                   │
│   - toBlob('image/jpeg', 0.95)                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Store in IndexedDB                             │
│                  (offline queue)                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │ [If online]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               POST /api/photos (multipart)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Server-Side (Processing)

```
┌─────────────────────────────────────────────────────────────────┐
│                   Receive upload                                │
│                   (Fastify multipart)                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Save original                                │
│        /data/photos/{slug}/original/{uuid}.jpg                  │
│                    (untouched)                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Sharp processing                               │
│                                                                 │
│   Web version:                                                  │
│   - Resize: max 1920px (maintain aspect)                        │
│   - Quality: 85%                                                │
│   - Output: /data/photos/{slug}/web/{uuid}.jpg                  │
│                                                                 │
│   Thumbnail:                                                    │
│   - Resize: 400px width                                         │
│   - Quality: 80%                                                │
│   - Output: /data/photos/{slug}/thumb/{uuid}.jpg                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ [If part of session with all photos received]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Generate photo strip                              │
│   - Load web versions                                           │
│   - Composite vertically                                        │
│   - Add padding/borders                                         │
│   - Output: /data/photos/{slug}/strips/{session-uuid}.jpg       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ [If email requested or auto-send enabled]
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Send email                                   │
│   - Attach: web versions + strip                                │
│   - Include: gallery link                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Sharp Processing Code

```typescript
import sharp from 'sharp';
import path from 'path';

interface ProcessedImage {
  original: string;
  web: string;
  thumb: string;
}

export async function processPhoto(
  inputBuffer: Buffer,
  slug: string,
  photoId: string
): Promise<ProcessedImage> {
  const basePath = `/data/photos/${slug}`;
  
  const paths = {
    original: path.join(basePath, 'original', `${photoId}.jpg`),
    web: path.join(basePath, 'web', `${photoId}.jpg`),
    thumb: path.join(basePath, 'thumb', `${photoId}.jpg`),
  };
  
  // Save original (no processing)
  await sharp(inputBuffer)
    .toFile(paths.original);
  
  // Web version (resized, compressed)
  await sharp(inputBuffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(paths.web);
  
  // Thumbnail
  await sharp(inputBuffer)
    .resize(400, 400, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(paths.thumb);
  
  return paths;
}
```

---

## 11. Photo Strip Layouts

### Standard Vertical Strip

```
┌───────────────────────────┐
│         20px padding      │
├───────────────────────────┤
│  ┌─────────────────────┐  │
│  │                     │  │
│  │      Photo 1        │  │
│  │      (4:3)          │  │
│  │                     │  │
│  └─────────────────────┘  │
│         10px gap          │
│  ┌─────────────────────┐  │
│  │                     │  │
│  │      Photo 2        │  │
│  │      (4:3)          │  │
│  │                     │  │
│  └─────────────────────┘  │
│         10px gap          │
│  ┌─────────────────────┐  │
│  │                     │  │
│  │      Photo 3        │  │
│  │      (4:3)          │  │
│  │                     │  │
│  └─────────────────────┘  │
│         10px gap          │
│  ┌─────────────────────┐  │
│  │                     │  │
│  │      Photo 4        │  │
│  │      (4:3)          │  │
│  │                     │  │
│  └─────────────────────┘  │
│         20px padding      │
├───────────────────────────┤
│                           │
│   [OVERLAY ZONE - TODO]   │
│   Wedding date, names,    │
│   decorative elements     │
│                           │
└───────────────────────────┘
```

### Strip Generation Code

```typescript
import sharp from 'sharp';

interface StripOptions {
  photoWidth: number;      // Width of each photo in strip
  padding: number;         // Outer padding
  gap: number;             // Gap between photos
  backgroundColor: string; // Strip background color
}

const DEFAULT_OPTIONS: StripOptions = {
  photoWidth: 600,
  padding: 20,
  gap: 10,
  backgroundColor: '#ffffff',
};

export async function generateStrip(
  photoPaths: string[],
  outputPath: string,
  options: Partial<StripOptions> = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const photoHeight = Math.round(opts.photoWidth * 0.75); // 4:3 aspect
  
  // Calculate total dimensions
  const totalWidth = opts.photoWidth + (opts.padding * 2);
  const totalHeight = 
    (opts.padding * 2) + 
    (photoHeight * photoPaths.length) + 
    (opts.gap * (photoPaths.length - 1)) +
    80; // Extra space for overlay zone (TODO)
  
  // Resize all photos to consistent size
  const resizedPhotos = await Promise.all(
    photoPaths.map(async (p, i) => ({
      input: await sharp(p)
        .resize(opts.photoWidth, photoHeight, { fit: 'cover' })
        .toBuffer(),
      top: opts.padding + (i * (photoHeight + opts.gap)),
      left: opts.padding,
    }))
  );
  
  // Create strip canvas and composite photos
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: opts.backgroundColor,
    },
  })
    .composite(resizedPhotos)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}
```

### Future: Overlay System (TODO)

```typescript
interface OverlayConfig {
  enabled: boolean;
  template: 'minimal' | 'elegant' | 'festive';
  text: {
    line1: string;  // e.g., "Haven & Hayden"
    line2: string;  // e.g., "December 31, 2025"
  };
  font: string;
  color: string;
}

// To be implemented in Phase 4
export async function applyOverlay(
  stripPath: string,
  config: OverlayConfig
): Promise<void> {
  // Use sharp composite with SVG text overlay
  // Or use node-canvas for more complex text rendering
}
```

---

## 12. Audio & Visual Feedback

### Sound Effects

| Sound | Trigger | File | Duration |
|-------|---------|------|----------|
| **Beep** | Each countdown second | `/sounds/beep.mp3` | ~100ms |
| **Shutter** | Photo capture | `/sounds/shutter.mp3` | ~200ms |

### Audio Service

```typescript
// lib/services/audio.ts

class AudioService {
  private beepSound: HTMLAudioElement | null = null;
  private shutterSound: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  
  async init() {
    this.beepSound = new Audio('/sounds/beep.mp3');
    this.shutterSound = new Audio('/sounds/shutter.mp3');
    
    // Preload
    await Promise.all([
      this.beepSound.load(),
      this.shutterSound.load(),
    ]);
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  playBeep() {
    if (!this.enabled || !this.beepSound) return;
    this.beepSound.currentTime = 0;
    this.beepSound.play().catch(() => {});
  }
  
  playShutter() {
    if (!this.enabled || !this.shutterSound) return;
    this.shutterSound.currentTime = 0;
    this.shutterSound.play().catch(() => {});
  }
}

export const audio = new AudioService();
```

### Flash Effect

```svelte
<!-- FlashOverlay.svelte -->
<script>
  export let trigger = false;
  
  let visible = false;
  
  $: if (trigger) {
    flash();
  }
  
  function flash() {
    visible = true;
    setTimeout(() => {
      visible = false;
    }, 150);
  }
</script>

{#if visible}
  <div class="flash-overlay"></div>
{/if}

<style>
  .flash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 9999;
    pointer-events: none;
    animation: flash 150ms ease-out;
  }
  
  @keyframes flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
</style>
```

### Countdown Component

```svelte
<!-- Countdown.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { audio } from '$lib/services/audio';
  
  export let seconds = 3;
  
  const dispatch = createEventDispatcher();
  
  let current = seconds;
  let active = false;
  
  export function start() {
    current = seconds;
    active = true;
    tick();
  }
  
  function tick() {
    if (current > 0) {
      audio.playBeep();
      setTimeout(() => {
        current--;
        if (current > 0) {
          tick();
        } else {
          active = false;
          dispatch('complete');
        }
      }, 1000);
    }
  }
</script>

{#if active && current > 0}
  <div class="countdown-overlay">
    <span class="countdown-number">{current}</span>
  </div>
{/if}

<style>
  .countdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
  }
  
  .countdown-number {
    font-family: 'Great Vibes', cursive;
    font-size: 12rem;
    color: white;
    text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
    animation: pulse 1s ease-in-out;
  }
  
  @keyframes pulse {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
</style>
```

---

## 13. Configuration Options

### Admin-Configurable Settings

| Setting | Key | Default | Range | Description |
|---------|-----|---------|-------|-------------|
| Initial countdown | `countdown_initial` | 3 | 1-10 seconds | Delay before first photo |
| Between-shot delay | `countdown_between` | 1 | 0.5-5 seconds | Delay between photos in sequence |
| Max photos per session | `max_photos` | 10 | 2-20 | Maximum photos in booth mode |
| Mirror preview | `mirror_preview` | true | boolean | Flip camera preview horizontally |
| Overlay enabled | `overlay_enabled` | false | boolean | Add branding to strips (TODO) |
| Email auto-send | `email_auto_send` | false | boolean | Automatically email after save |
| Sound effects | `sound_enabled` | true | boolean | Play beeps and shutter sounds |

### User-Adjustable Settings (Per Session)

These can be adjusted in the Photo Booth mode setup screen:

- Photo count (2-10)
- Initial countdown (1-10s)
- Between-shot delay (0.5-5s)

### Config Storage

```sql
-- Default values inserted on first run
INSERT INTO config (key, value) VALUES
  ('countdown_initial', '3'),
  ('countdown_between', '1'),
  ('max_photos', '10'),
  ('mirror_preview', 'true'),
  ('overlay_enabled', 'false'),
  ('email_auto_send', 'false'),
  ('sound_enabled', 'true');
```

---

## 14. URL Structure

| URL | Purpose | Auth |
|-----|---------|------|
| `/` | Landing page / Name entry | None |
| `/booth` | Main menu & capture interface | Guest (localStorage) |
| `/booth/single` | Single photo capture mode | Guest |
| `/booth/multi` | Photo booth mode (multi-shot) | Guest |
| `/gallery/:slug` | Personal gallery (e.g., `/gallery/sarah-m`) | None (public but unlisted) |
| `/admin` | Admin dashboard | Password |
| `/admin/config` | Configuration panel | Password |
| `/admin/users` | Guest list | Password |
| `/admin/photos` | All photos browser | Password |

### Routing Notes

- `/gallery/:slug` is publicly accessible but not linked anywhere except in emails and "My Photos" — security through obscurity is acceptable for wedding photos
- Admin routes require password entry, stored in session

---

## 15. Email System

### Provider: Google Workspace SMTP

Using existing Google Workspace account for reliable delivery.

### Nodemailer Configuration

```typescript
// services/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,        // e.g., photobooth@yourdomain.com
    pass: process.env.GMAIL_APP_PASSWORD, // App-specific password
  },
});

interface EmailOptions {
  to: string;
  name: string;
  slug: string;
  photoPaths: string[];  // Web-sized images
  stripPath?: string;    // Photo strip if applicable
}

export async function sendPhotosEmail(options: EmailOptions): Promise<void> {
  const { to, name, slug, photoPaths, stripPath } = options;
  
  const attachments = photoPaths.map((p, i) => ({
    filename: `photo-${i + 1}.jpg`,
    path: p,
  }));
  
  if (stripPath) {
    attachments.push({
      filename: 'photo-strip.jpg',
      path: stripPath,
    });
  }
  
  await transporter.sendMail({
    from: '"Haven & Hayden Photo Booth" <photobooth@meekthenilands.com>',
    to,
    subject: "Your photos from Haven & Hayden's wedding! 📸",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
        <h1 style="font-family: 'Great Vibes', cursive; font-size: 2.5em; text-align: center;">
          Haven & Hayden
        </h1>
        <p>Hey ${name}!</p>
        <p>Thanks for celebrating with us! Here are your photos from the booth.</p>
        <p>
          <strong>View all your photos anytime:</strong><br>
          <a href="https://photobooth.meekthenilands.com/gallery/${slug}">
            photobooth.meekthenilands.com/gallery/${slug}
          </a>
        </p>
        <p style="margin-top: 30px;">
          Love,<br>
          Haven & Hayden 💍
        </p>
        <p style="color: #888; font-size: 0.9em; margin-top: 40px; text-align: center;">
          ◆ New Year's Eve 2025 ◆
        </p>
      </div>
    `,
    attachments,
  });
}
```

### Email Triggers

1. **Manual** — Guest taps "Email my photos" in gallery
2. **Auto** — If `email_auto_send` config is enabled, send after each save
3. **Bulk** — Admin can trigger email to all guests with photos

---

## 16. Security Considerations

### Authentication

| Endpoint | Method |
|----------|--------|
| Guest routes | localStorage session token + device fingerprint |
| Admin routes | Password (env variable `ADMIN_PASSWORD`) |

### Input Validation

- **File uploads:** Accept only `image/jpeg`, `image/png`, `image/webp`; max 20MB per file
- **Name input:** Sanitize, limit to 50 characters, alphanumeric + spaces
- **Slug generation:** URL-safe characters only, lowercase

### Rate Limiting

```typescript
// Fastify rate limit plugin
fastify.register(require('@fastify/rate-limit'), {
  max: 100,              // requests
  timeWindow: '1 minute',
  allowList: ['127.0.0.1'], // localhost for development
});

// Stricter limit for uploads
fastify.register(require('@fastify/rate-limit'), {
  max: 20,
  timeWindow: '1 minute',
  routeConfig: {
    routes: ['/api/photos'],
  },
});
```

### CORS

```typescript
fastify.register(require('@fastify/cors'), {
  origin: [
    'https://photobooth.meekthenilands.com',
    'http://localhost:5173', // dev
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

### Storage Monitoring

- Alert if disk usage exceeds 80%
- Estimated storage: ~3MB per photo set (original + web + thumb) × 200 guests × 5 sessions = ~3GB
- Ensure at least 10GB available

### Backup Strategy

- Nightly rsync of `/data/photos` and `photobooth.db` to secondary storage
- Consider Cloudflare R2 backup if paranoid

---

## 17. Offline Behavior

### Detection

```typescript
// lib/services/offline.ts
import { writable } from 'svelte/store';

export const isOnline = writable(navigator.onLine);

window.addEventListener('online', () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));
```

### UI Indicators

```svelte
<!-- OfflineIndicator.svelte -->
<script>
  import { isOnline } from '$lib/services/offline';
</script>

{#if !$isOnline}
  <div class="offline-banner">
    📡 You're offline — photos will sync when connected
  </div>
{/if}

<style>
  .offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 200, 0, 0.9);
    color: #000;
    text-align: center;
    padding: 8px;
    font-size: 0.9rem;
    z-index: 1000;
  }
</style>
```

### Offline Queue

```typescript
// lib/services/offlineQueue.ts
import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'photobooth-offline';
const STORE_NAME = 'pending-photos';

interface PendingPhoto {
  id: string;
  userId: string;
  sessionId: string | null;
  blob: Blob;
  capturedAt: string;
  sequenceNumber: number | null;
  retryCount: number;
}

let db: IDBPDatabase;

export async function initOfflineDB() {
  db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    },
  });
}

export async function queuePhoto(photo: Omit<PendingPhoto, 'retryCount'>) {
  await db.add(STORE_NAME, { ...photo, retryCount: 0 });
}

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  return db.getAll(STORE_NAME);
}

export async function removePendingPhoto(id: string) {
  await db.delete(STORE_NAME, id);
}

export async function incrementRetry(id: string) {
  const photo = await db.get(STORE_NAME, id);
  if (photo) {
    photo.retryCount++;
    await db.put(STORE_NAME, photo);
  }
}
```

### Sync Process

```typescript
// lib/services/sync.ts
import { getPendingPhotos, removePendingPhoto, incrementRetry } from './offlineQueue';
import { uploadPhoto } from './api';

export async function syncPendingPhotos() {
  const pending = await getPendingPhotos();
  
  for (const photo of pending) {
    if (photo.retryCount >= 5) {
      console.warn(`Giving up on photo ${photo.id} after 5 retries`);
      continue;
    }
    
    try {
      await uploadPhoto({
        userId: photo.userId,
        sessionId: photo.sessionId,
        blob: photo.blob,
        capturedAt: photo.capturedAt,
        sequenceNumber: photo.sequenceNumber,
      });
      await removePendingPhoto(photo.id);
    } catch (err) {
      console.error(`Failed to sync photo ${photo.id}:`, err);
      await incrementRetry(photo.id);
      break; // Stop on first failure, will retry later
    }
  }
}

// Trigger sync on app start and when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncPendingPhotos);
  // Also run on app initialization
  syncPendingPhotos();
}
```

---

## 18. Project Phases & Checklist

### Phase 1: Core MVP

**Goal:** Single photo capture with basic flow

- [ ] Project scaffolding (SvelteKit + Fastify)
- [ ] Docker Compose setup
- [ ] SQLite database initialization
- [ ] Name entry flow with device fingerprinting
- [ ] Camera access and mirrored viewfinder
- [ ] Single photo capture with countdown
- [ ] Flash effect and shutter sound
- [ ] Photo preview and retake
- [ ] Server upload endpoint
- [ ] Sharp image processing (original, web, thumb)
- [ ] Basic personal gallery (`/gallery/:slug`)
- [ ] Cloudflare Tunnel deployment

**Deliverable:** Guests can enter name, take single photos, view their gallery

---

### Phase 2: Photo Booth Mode

**Goal:** Multi-shot sequences with strips

- [ ] Photo booth mode UI (count selector, timing config)
- [ ] Sequential capture with between-shot delays
- [ ] Session creation and photo grouping
- [ ] Photo strip generation
- [ ] Combined preview (grid + strip)
- [ ] Retake all functionality
- [ ] Session display in gallery

**Deliverable:** Full photo booth experience with classic strips

---

### Phase 3: Polish & Reliability

**Goal:** Production-ready for wedding day

- [ ] PWA manifest and service worker
- [ ] Offline photo queue (IndexedDB)
- [ ] Background sync
- [ ] Offline UI indicators
- [ ] Email delivery (Nodemailer + Google Workspace)
- [ ] Admin dashboard (guest list, all photos)
- [ ] Admin configuration panel
- [ ] Bulk download (ZIP)
- [ ] Stress testing on Proxmox
- [ ] Fallback plan (Railway deployment)

**Deliverable:** Reliable system that handles offline gracefully

---

### Phase 4: Nice-to-Have (Time Permitting)

**Goal:** Extra polish and features

- [ ] Overlay system for photo strips (wedding branding)
- [ ] Custom overlay templates
- [ ] Print integration (if printer available)
- [ ] QR code display for easy gallery access
- [ ] Photo slideshow mode for reception display
- [ ] Guest book integration (photo + message)

---

## 19. Future Enhancements

These are ideas for post-wedding or if this becomes a reusable product:

### Potential Features

1. **Video messages** — Short video clips in addition to photos
2. **GIF mode** — Animated GIF from multi-shot sequence
3. **Social sharing** — Direct share to Instagram, etc.
4. **Live slideshow** — Real-time display of new photos on secondary screen
5. **Custom frames** — Multiple frame/overlay designs
6. **Multi-event support** — Reusable for future events
7. **Analytics** — Photo count trends, peak usage times
8. **Face detection** — Auto-crop to faces, ensure everyone in frame

### Accessibility Improvements

- High contrast mode
- Screen reader support for controls
- Voice-activated capture ("Say cheese!")
- Larger touch targets for accessibility

---

## Appendix A: Environment Variables

```env
# .env file

# Database
DATABASE_PATH=/data/photobooth.db

# Storage
PHOTOS_PATH=/data/photos

# Admin
ADMIN_PASSWORD=your-secure-password-here

# Email (Google Workspace)
GMAIL_USER=photobooth@meekthenilands.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# App
PUBLIC_URL=https://photobooth.meekthenilands.com
NODE_ENV=production
```

---

## Appendix B: Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: ./app
    restart: unless-stopped
    environment:
      - DATABASE_PATH=/data/photobooth.db
      - PHOTOS_PATH=/data/photos
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - GMAIL_USER=${GMAIL_USER}
      - GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}
      - PUBLIC_URL=https://photobooth.meekthenilands.com
      - NODE_ENV=production
    volumes:
      - ./data:/data
    networks:
      - photobooth

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/build:/usr/share/nginx/html:ro
      - ./data/photos:/usr/share/nginx/photos:ro
    ports:
      - "8080:80"
    depends_on:
      - app
    networks:
      - photobooth

networks:
  photobooth:
    driver: bridge
```

---

## Appendix C: Nginx Configuration

```nginx
# nginx/nginx.conf

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        server_name localhost;

        # Frontend (SvelteKit build)
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/ {
            proxy_pass http://app:3000/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_cache_bypass $http_upgrade;
            
            # Increase timeouts for file uploads
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
            client_max_body_size 50M;
        }

        # Static photo files
        location /photos/ {
            alias /usr/share/nginx/photos/;
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

---

## 20. Implementation Updates (December 10, 2024)

### ✅ **Phase 1: Complete & Tested**

As of December 10, 2024, Phase 1 has been fully implemented and tested. Below are the key differences between the original design and actual implementation.

### Implementation Changes

#### 1. Backend Port Change
**Original:** Port 3000  
**Actual:** Port **3001**  
**Reason:** Port 3000 was occupied by another application on dev machine  
**Impact:** 
- `app/.env`: `PORT=3001`
- `frontend/vite.config.js`: Proxy targets `localhost:3001`

#### 2. Device Fingerprinting Behavior
**Original:** Device fingerprint auto-returns users to existing account  
**Actual:** Device fingerprint stored but **NOT used for auto-login**  
**Reason:** Wedding requires multiple guests to use same tablet  
**Impact:**
- Users identified by localStorage only
- Device fingerprint kept for database tracking
- Multiple users can share same device seamlessly

#### 3. Name Conflict Resolution Enhancement
**Original:** Show error message, user figures it out  
**Actual:** Smart two-button UI: "That's Me" vs "Different Person"  
**Improvement:**
- "That's Me" → Claims existing account (loads their photos)
- "Different Person" → Auto-creates numbered variant (e.g., "Sarah M2")
- Better UX for device switching and duplicate names

#### 4. User Flow Enhancement
**Original:** Auto-redirect returning users to `/booth`  
**Actual:** Show "Welcome back! Continue or Switch?" screen  
**Improvement:**
- Easier user switching on shared devices
- Clearer user experience
- Still fast for returning users (one click)

### Phase 1 Checklist — Updated Status

- [x] Project scaffolding (SvelteKit + Fastify)
- [x] SQLite database initialization
- [x] Name entry flow with device fingerprinting
- [x] Camera access and mirrored viewfinder
- [x] Single photo capture with countdown
- [x] Flash effect (visual only - sound files optional)
- [x] Photo preview and retake
- [x] Server upload endpoint
- [x] Sharp image processing (original, web, thumb)
- [x] Basic personal gallery (`/gallery/:slug`)
- [ ] Docker Compose setup (Phase 6)
- [ ] Cloudflare Tunnel deployment (Phase 6)

**Deliverable Status:** ✅ Complete - Guests can enter name, take single photos, view their gallery

### Technical Specifications (As-Built)

| Component | Specification |
|-----------|---------------|
| Backend Framework | Fastify 4.25.2 |
| Backend Port | 3001 (dev), configurable via .env |
| Database | SQLite via better-sqlite3 9.2.2 |
| Image Processing | Sharp 0.33.1 |
| Frontend Framework | SvelteKit 2.0 |
| Frontend Port | 5173 (Vite dev server) |
| Styling | Tailwind CSS 3.4 |
| PWA Support | vite-plugin-pwa 0.17.4 |

### Testing Status

✅ **Verified Working:**
- User creation with conflict resolution
- Single photo capture end-to-end
- Photo processing (3 versions)
- Personal galleries
- Multi-user support on same device
- Data persistence (SQLite + files)
- Beautiful UI with starry background

### Repository

**GitHub:** https://github.com/meezymeek/HHWeddingBooth  
**Commit:** c08cb86 (Phase 1 complete)  
**Last Updated:** December 10, 2024

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | Claude + Hayden | Initial design document |
| 1.1 | December 10, 2024 | Cline + Hayden | Phase 1 implementation updates, actual vs planned changes |

---

*End of Document*
