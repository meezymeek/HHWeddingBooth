# Testing Guide - Photo Booth PWA Phase 1

## Prerequisites

Before testing, ensure:
- [x] Backend dependencies installed (`cd app && npm install`)
- [x] Frontend dependencies installed (`cd frontend && npm install`)
- [x] Backend .env file created and configured
- [x] Backend server is running (`cd app && npm run dev`)
- [ ] Frontend dev server is running (`cd frontend && npm run dev`)

## Required Static Assets

You need to add these sound files to `frontend/static/sounds/`:

1. **beep.mp3** - Short beep sound for countdown (100-200ms)
   - You can use free sound effects from:
     - https://freesound.org/
     - https://mixkit.co/free-sound-effects/
   - Search for "countdown beep" or "timer beep"

2. **shutter.mp3** - Camera shutter sound (200-300ms)
   - Search for "camera shutter" or "camera click"

### Placeholder Creation (Temporary)

For now, you can create empty placeholder files:
```powershell
# Create directories
New-Item -ItemType Directory -Force -Path frontend/static/sounds
New-Item -ItemType Directory -Force -Path frontend/static/icons

# Create placeholder files (will need to be replaced with actual audio)
New-Item -ItemType File -Path frontend/static/sounds/beep.mp3
New-Item -ItemType File -Path frontend/static/sounds/shutter.mp3
```

## Phase 1 Testing Checklist

### 1. Backend API Testing

#### Test Server Startup
```powershell
cd app
npm run dev
```

Expected output:
```
✅ Database initialized successfully
✅ Storage directory created
🚀 Photo Booth API Server Started
📡 Listening on http://0.0.0.0:3000
```

#### Test Health Endpoint
```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-12-10T..."}
```

#### Test User Creation
```powershell
curl -X POST http://localhost:3000/api/users `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test\",\"last_initial\":\"U\",\"device_fingerprint\":\"test123\"}'
```

Expected response (201 Created):
```json
{
  "id": "...",
  "name": "Test U",
  "slug": "test-u",
  "email": null,
  "is_new": true
}
```

### 2. Frontend Testing

#### Start Frontend Dev Server
```powershell
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### Manual Testing Flow

1. **Name Entry Flow**
   - [ ] Open http://localhost:5173/
   - [ ] See starry background animation
   - [ ] Enter first name: "Test"
   - [ ] Enter last initial: "U"
   - [ ] Optionally enter email
   - [ ] Click "Let's Go! 📸"
   - [ ] Should redirect to /booth

2. **Booth Menu**
   - [ ] See welcome message with user name
   - [ ] See two mode cards: "Single Photo" and "Photo Booth"
   - [ ] See "My Gallery" button
   - [ ] See "Switch User" button

3. **Single Photo Capture**
   - [ ] Click "Single Photo" card
   - [ ] Camera permission prompt appears (grant it)
   - [ ] See mirrored camera viewfinder
   - [ ] Click capture button (white circle)
   - [ ] See/hear countdown: 3... 2... 1...
   - [ ] See white flash effect
   - [ ] Hear shutter sound (if audio files are present)
   - [ ] See preview of captured photo
   - [ ] Try "Retake" button (should return to camera)
   - [ ] Try "Save Photo" button
   - [ ] Should redirect back to /booth

4. **Gallery View**
   - [ ] Click "My Gallery" from booth menu
   - [ ] See captured photo in grid
   - [ ] Click photo to view fullscreen
   - [ ] Click anywhere to close fullscreen view
   - [ ] See "Back to Booth" button works

5. **Multiple Users**
   - [ ] Click "Switch User"
   - [ ] Enter different name
   - [ ] Verify new user has empty gallery
   - [ ] Take photo with new user
   - [ ] Switch back to first user (enter same name/initial)
   - [ ] Verify first user still sees their photos

### 3. Database Verification

Check that data is being saved:

```powershell
sqlite3 data/photobooth.db
```

```sql
-- View all users
SELECT * FROM users;

-- View all photos
SELECT * FROM photos;

-- View photo count per user
SELECT u.name, COUNT(p.id) as photo_count
FROM users u
LEFT JOIN photos p ON u.id = p.user_id
GROUP BY u.id;

-- Exit sqlite3
.exit
```

### 4. File Storage Verification

Check that photos are being stored:

```powershell
# List photo directories
Get-ChildItem -Path data/photos -Recurse
```

Expected structure:
```
data/photos/
└── test-u/
    ├── original/
    │   └── {uuid}.jpg
    ├── web/
    │   └── {uuid}.jpg
    └── thumb/
        └── {uuid}.jpg
```

## Known Issues & TypeScript Errors

The TypeScript errors you see are expected until we run SvelteKit for the first time:
- `.svelte-kit/tsconfig.json` is generated when you run `npm run dev` in frontend
- The errors will resolve automatically once SvelteKit initializes

## Performance Benchmarks

During testing, monitor:
- [ ] Photo upload time: Should be < 2 seconds
- [ ] Image processing time: Should be < 1 second per photo
- [ ] Gallery load time: Should be < 1 second with 10 photos
- [ ] Camera startup: Should be < 2 seconds

## Common Issues & Solutions

### Camera not working
- **Issue**: "Camera not supported" or permission denied
- **Solution**: Ensure HTTPS in production, or use localhost for dev. Some browsers require HTTPS for camera access.

### Photos not uploading
- **Issue**: Network error or 500 Internal Server Error
- **Solution**: Check backend logs, verify .env configuration, ensure data directory has write permissions

### Starry background not animating
- **Issue**: Static background or no stars
- **Solution**: Check browser console for JavaScript errors, ensure CSS animations are supported

### Mirror effect not working
- **Issue**: Photo appears flipped the wrong way
- **Solution**: Toggle `mirror_preview` config in database or future admin panel

## Next Steps After Phase 1

Once all tests pass:
- [ ] Implement Phase 2: Photo Booth Mode (multi-shot)
- [ ] Implement Phase 3: PWA offline support & email
- [ ] Stress test with multiple devices
- [ ] Set up production deployment
