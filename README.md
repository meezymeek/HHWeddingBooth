# Haven & Hayden Wedding Photo Booth

A Progressive Web App (PWA) photo booth for Haven & Hayden's New Year's Eve 2025 wedding.

## ✅ Project Status: Phase 3 IMPLEMENTED & READY FOR TESTING

**Latest Update:** December 10, 2024  
**Current Version:** 3.0.0 (Phase 3 - Production Ready)  
**Commit:** (pending)

### ✅ **Phase 1: COMPLETE** — Fully Working & Tested

#### Backend Infrastructure (100% Complete)
- ✅ Fastify API server on port 3001
- ✅ SQLite database with full schema
- ✅ User management with smart conflict resolution
- ✅ Photo upload and processing (Sharp)
- ✅ Session management (ready for Phase 2)
- ✅ Photo strip generation (ready for Phase 2)
- ✅ Storage service with automatic directory management
- ✅ Rate limiting and CORS configuration

#### Frontend Application (100% Complete)
- ✅ SvelteKit PWA with static adapter
- ✅ Name entry flow with conflict resolution UI
- ✅ Camera component with mirrored viewfinder
- ✅ Countdown component with visual feedback
- ✅ Flash effect component
- ✅ Single photo capture flow
- ✅ Photo preview with retake/save
- ✅ Personal gallery with fullscreen viewer
- ✅ Animated starry background
- ✅ Wedding-themed UI (glassmorphism, custom fonts)
- ✅ Multi-user support on same device

### ✅ **Phase 2: COMPLETE** — Multi-Shot Photo Booth Mode

#### New Features Delivered
- ✅ Multi-shot photo booth configuration UI
- ✅ Configurable photo count (2-10 photos, default 4)
- ✅ Configurable timing (countdown & delays)
- ✅ Sequential automatic capture with progress tracking
- ✅ Real-time thumbnail strip during capture
- ✅ Photo strip generation (vertical layout with borders)
- ✅ Enhanced preview with strip + individual photos
- ✅ Retake all functionality
- ✅ Gallery integration for photo booth sessions

#### Key UX Decisions
- **Number-only countdown**: Clean viewfinder without blur overlay
- **Automatic progression**: No user interaction needed after start
- **Live feedback**: Progress dots and thumbnail strip during capture
- **Beautiful strips**: Professional vertical photo booth layout

### 📋 **What's Working Now**

✅ Guests can create accounts (first name + last initial)  
✅ Smart handling when names conflict ("That's Me" vs "Different Person")  
✅ **Single photo mode**: Quick capture with countdown  
✅ **Multi-shot booth mode**: Sequential captures with photo strips  
✅ **Offline support**: Photos queue when offline, auto-sync when connected  
✅ **Email delivery**: Send photos to guests via email  
✅ **Admin dashboard**: Monitor activity, download photos, send bulk emails  
✅ Photo processing (original, web, thumbnail) + strip generation  
✅ Personal galleries with sessions and individual photos  
✅ Multiple users can use same device/tablet  
✅ Data persists in SQLite + file storage  
✅ Beautiful wedding-themed UI with animations  
✅ PWA-ready with service worker and enhanced caching  

### ✅ **Phase 3: Complete!**

**New Features:**
- 🔌 Offline photo capture with automatic sync
- 📧 Email delivery with wedding-branded templates
- 👤 Admin dashboard for wedding day management
- 📦 Bulk operations (ZIP download, bulk emails)
- ⚡ Enhanced PWA caching for better performance

### 🧪 **Next: Testing**

See `PHASE3_TESTING_CHECKLIST.md` for comprehensive testing guide (33 tests).

**Quick Configuration:**
1. Set `GMAIL_APP_PASSWORD` in `app/.env` (see .env.example)
2. Set `ADMIN_PASSWORD` in `app/.env`
3. Run tests to verify all features work
4. Ready for wedding day! 🎉

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm or yarn
- Git

### Installation

1. **Clone Repository**
   ```powershell
   git clone https://github.com/meezymeek/HHWeddingBooth.git
   cd HHWeddingBooth
   ```

2. **Install Backend Dependencies**
   ```powershell
   cd app
   npm install
   ```

3. **Install Frontend Dependencies**
   ```powershell
   cd frontend
   npm install
   ```

4. **Create Environment File**
   ```powershell
   cd app
   Copy-Item .env.example .env
   # PORT is already set to 3001 (don't change unless needed)
   ```

### Development

1. **Start Backend Server**
   ```powershell
   cd app
   npm run dev
   ```
   Server will run on `http://localhost:3001` ⚠️ Note: Port 3001, not 3000

2. **Start Frontend Dev Server** (in a new terminal)
   ```powershell
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

3. **Access the Application**
   - Frontend: http://localhost:5173
   - API Health Check: http://localhost:3001/health
   - Full Documentation: See `PROJECT_STATUS.md` and `photobooth-pwa-design-document.md`

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

### Phase 1: Core MVP ✅ **COMPLETE**
- [x] Backend API infrastructure
- [x] Frontend application
- [x] Name entry flow with conflict resolution
- [x] Single photo capture
- [x] Personal galleries
- [x] Multi-user support
- [x] Tested and working

### Phase 2: Photo Booth Mode ✅ **COMPLETE**
- [x] Multi-shot configuration UI
- [x] Sequential capture with auto-progression
- [x] Photo strip generation
- [x] Session management
- [x] Gallery integration
- [x] Number-only countdown (clean viewfinder)
- [x] Tested and working

### Phase 3: Polish & Reliability ✅ **COMPLETE**
- [x] PWA offline support with IndexedDB queue
- [x] Email delivery (individual & bulk)
- [x] Admin dashboard with auth
- [x] Bulk download (ZIP)
- [x] Enhanced service worker caching
- [ ] PWA icons (design needed)
- [ ] Full testing (see PHASE3_TESTING_CHECKLIST.md)

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
IN PRODUCTION TEST
