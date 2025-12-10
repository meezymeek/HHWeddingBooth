# Haven & Hayden Wedding Photo Booth

A Progressive Web App (PWA) photo booth for Haven & Hayden's New Year's Eve 2025 wedding.

## 🎉 Project Status: Phase 1 In Progress (47% Complete)

### ✅ Completed Components

#### Backend Infrastructure (100% Complete)
- ✅ Fastify API server with TypeScript
- ✅ SQLite database with full schema
- ✅ User management system with device fingerprinting
- ✅ Photo upload and processing (Sharp)
- ✅ Session management for multi-shot sequences
- ✅ Photo strip generation
- ✅ Storage service with automatic directory management
- ✅ Rate limiting and CORS configuration

#### Frontend Configuration (100% Complete)
- ✅ SvelteKit setup with static adapter
- ✅ TypeScript configuration
- ✅ Tailwind CSS with custom wedding theme
- ✅ Vite configuration with PWA plugin
- ✅ PostCSS configuration

### 🚧 Next Steps to Complete Phase 1

#### Frontend Components (Remaining)
- [ ] Install frontend dependencies (`cd frontend && npm install`)
- [ ] Create app HTML template (`src/app.html`)
- [ ] Create global styles with starry background
- [ ] Build name entry flow component
- [ ] Implement device fingerprinting utility
- [ ] Create Svelte stores (user, photos, config)
- [ ] Build API service layer
- [ ] Create Camera component with mirrored viewfinder
- [ ] Build Countdown component with audio
- [ ] Create flash effect component
- [ ] Build photo preview screen
- [ ] Create booth mode interface
- [ ] Build personal gallery page

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Git

### Installation

1. **Install Backend Dependencies**
   ```powershell
   cd app
   npm install
   ```

2. **Install Frontend Dependencies**
   ```powershell
   cd frontend
   npm install
   ```

3. **Create Environment File**
   ```powershell
   cd app
   Copy-Item .env.example .env
   # Edit .env with your configuration
   ```

### Development

1. **Start Backend Server**
   ```powershell
   cd app
   npm run dev
   ```
   Server will run on `http://localhost:3000`

2. **Start Frontend Dev Server** (in a new terminal)
   ```powershell
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

3. **Access the Application**
   - Frontend: http://localhost:5173
   - API Health Check: http://localhost:3000/health
   - API Docs: See `photobooth-pwa-design-document.md`

## 📁 Project Structure

```
HHWeddingBooth/
├── app/                          # Backend (Fastify API)
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── routes/              # API routes
│   │   │   ├── users.ts         # User management
│   │   │   ├── photos.ts        # Photo upload/retrieval
│   │   │   └── sessions.ts      # Multi-shot sessions
│   │   ├── services/            # Business logic
│   │   │   ├── database.ts      # SQLite operations
│   │   │   ├── storage.ts       # File management
│   │   │   └── imaging.ts       # Sharp image processing
│   │   └── utils/
│   │       └── slug.ts          # URL-safe slug generation
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/                     # Frontend (SvelteKit PWA)
│   ├── src/
│   │   ├── routes/              # SvelteKit pages (to be created)
│   │   └── lib/                 # Components & services (to be created)
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── data/                         # Runtime data (created automatically)
│   ├── photobooth.db            # SQLite database
│   └── photos/                  # Uploaded photos
└── docs/
    └── photobooth-pwa-design-document.md
```

## 🎨 Design System

The app uses a custom wedding theme inspired by the meekthenilands.com homepage:

- **Colors**: Deep navy (#000814, #001233) with elegant grays
- **Fonts**: 
  - Display: Great Vibes (headings)
  - Script: Pinyon Script (accents)
  - Body: Playfair Display (content)
- **Effects**: Animated starry background, glassmorphism cards

## 🔌 API Endpoints

### User Management
- `POST /api/users` - Create or lookup user
- `GET /api/users/:slug` - Get user info

### Photo Management
- `POST /api/photos` - Upload photo
- `GET /api/users/:slug/photos` - Get user's photos

### Session Management
- `POST /api/sessions` - Create photo booth session
- `POST /api/sessions/:id/generate-strip` - Generate photo strip
- `GET /api/sessions/:id` - Get session details

### Health Check
- `GET /health` - Server health status

## 🛠 Development Commands

### Backend
```powershell
cd app
npm run dev          # Development server with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled code
```

### Frontend
```powershell
cd frontend
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type checking
```

## 📝 Configuration

### Backend Environment Variables (.env)
```env
DATABASE_PATH=/data/photobooth.db
PHOTOS_PATH=/data/photos
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
PUBLIC_URL=https://photobooth.meekthenilands.com
ADMIN_PASSWORD=change-me-please
GMAIL_USER=photobooth@meekthenilands.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

## 🐳 Deployment (Phase 6 - Not Yet Implemented)

Deployment will use:
- Docker Compose
- Nginx reverse proxy
- Cloudflare Tunnel for HTTPS
- Proxmox hosting

## 📚 Documentation

For complete design specifications, see `docs/photobooth-pwa-design-document.md`

## 🎯 Roadmap

### Phase 1: Core MVP (47% Complete) ⏳
- [x] Backend API infrastructure
- [x] Frontend configuration
- [ ] Name entry flow
- [ ] Single photo capture
- [ ] Personal gallery
- [ ] Basic deployment

### Phase 2: Photo Booth Mode
- [ ] Multi-shot sequences
- [ ] Photo strip generation
- [ ] Session management UI

### Phase 3: Polish & Reliability
- [ ] PWA offline support
- [ ] Email delivery
- [ ] Admin dashboard
- [ ] Stress testing

### Phase 4: Nice-to-Have
- [ ] Overlay system for strips
- [ ] Print integration
- [ ] QR code display

## 👥 Contributing

This is a private project for Haven & Hayden's wedding. Development by Hayden Nielands.

## 📄 License

Private - All Rights Reserved

---

**Event Date**: December 31, 2025 (New Year's Eve)  
**Domain**: photobooth.meekthenilands.com
