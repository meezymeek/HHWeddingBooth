# Implementation Notes for AI Agents

**Last Updated:** December 10, 2024  
**Phase:** 1 (Complete)

This document highlights key implementation decisions and deviations from the original design document for future AI agents working on this project.

---

## 🔑 **Critical Implementation Details**

### 1. Backend Port: 3001 (NOT 3000)

**Why:** Port 3000 was already in use by another Express application on the development machine.

**Configuration:**
- `app/.env`: `PORT=3001`
- `frontend/vite.config.js`: Proxy targets `http://localhost:3001`

**Impact:** All documentation and testing should reference port **3001** for the backend.

---

### 2. Device Fingerprinting Behavior Changed

**Original Design:** Device fingerprint was meant to auto-return users to their existing account.

**Actual Implementation:** Device fingerprint is stored in the database but **NOT used for auto-login**.

**Why:** Wedding scenario requires multiple guests to use the same tablet/device. Auto-login would prevent new guests from creating accounts.

**Current Behavior:**
- Device fingerprint is collected and stored (for potential future analytics)
- Users are identified by localStorage only
- Each new user enters their name, even on the same device
- Conflict resolution handles when names match

**Files Affected:**
- `app/src/routes/users.ts` - Removed device fingerprint lookup for auto-login
- `frontend/src/routes/+page.svelte` - Uses localStorage, not fingerprint

---

### 3. Name Conflict Resolution: Enhanced UX

**Original Design:** Return 409 error with suggestion, let user figure it out.

**Actual Implementation:** Smart two-button UI for conflict resolution.

**Behavior:**
When "Hayden M" already exists:
1. Backend returns 409 with `existing_user` data
2. Frontend shows friendly modal: "Is this you from earlier, or someone new?"
3. Two options:
   - **"Yes, that's me!"** → Claims existing account (loads their photos)
   - **"No, I'm someone different"** → Creates "Hayden M2" automatically

**Why:** Better UX for wedding guests who might switch devices, and handles rare case of duplicate names.

**Files:**
- `app/src/routes/users.ts` - Returns `existing_user` object in 409 response
- `frontend/src/routes/+page.svelte` - Conflict resolution UI with `conflictData` state

---

### 4. User Session Management

**Implementation:** localStorage-based, with opt-in return flow

**Behavior:**
- When user visits `/`, check localStorage for `photobooth_user`
- If found: Show "Welcome back! Continue as X?" with two buttons
  - Continue → Go to `/booth`
  - Switch User → Clear localStorage, show name entry
- If not found: Show name entry form

**Why:** Allows returning users to quickly continue, but also easy user switching on shared devices.

**File:** `frontend/src/routes/+page.svelte`

---

### 5. Photo Upload Flow (Single Photo)

**Sequence:**
1. User clicks capture button in Camera component
2. Countdown starts (3 seconds)
3. On countdown complete:
   - Flash effect triggers
   - Shutter sound plays (if file exists)
   - Video frame captured to canvas
   - Canvas converts to Blob (JPEG, 95% quality)
4. Preview shown with retake/save buttons
5. On save:
   - Upload to `/api/photos` as multipart/form-data
   - Backend processes with Sharp (3 versions)
   - Database record created
   - Success → redirect to `/booth`

**Files:**
- `frontend/src/lib/components/Camera.svelte`
- `frontend/src/routes/booth/single/+page.svelte`
- `app/src/routes/photos.ts`
- `app/src/services/imaging.ts`

---

### 6. Static File Serving

**Implementation:** Backend serves photos directly via `@fastify/static`

**Configuration:**
```typescript
await fastify.register(fastifyStatic, {
  root: PHOTOS_PATH,  // Must be absolute path
  prefix: '/photos/',
  decorateReply: false
});
```

**Why:** Simpler than separate static file server, works well for development.

**Note:** In production with Nginx, this will be handled by Nginx directly.

---

## 📂 **File Organization Notes**

### Backend Structure

```
app/src/
├── index.ts              # Server entry, plugin registration
├── routes/               # Route handlers (one file per resource)
│   ├── users.ts
│   ├── photos.ts
│   └── sessions.ts
├── services/             # Business logic, reusable services
│   ├── database.ts       # SQLite connection + prepared statements
│   ├── storage.ts        # File system operations
│   └── imaging.ts        # Sharp image processing
└── utils/                # Pure utility functions
    └── slug.ts
```

**Convention:** Routes are thin wrappers, business logic in services.

### Frontend Structure

```
frontend/src/
├── routes/               # SvelteKit pages (file-based routing)
│   ├── +page.svelte              # Home/name entry
│   ├── +layout.svelte            # Root layout with starry background
│   ├── booth/
│   │   ├── +page.svelte          # Mode selection menu
│   │   └── single/+page.svelte   # Single photo capture
│   └── gallery/[slug]/+page.svelte # Personal gallery
└── lib/
    ├── components/       # Reusable Svelte components
    ├── services/         # API and browser services
    ├── stores/           # Svelte stores (state management)
    └── utils/            # Pure utility functions
```

**Convention:** Components are presentational, services handle logic.

---

## 🔄 **Data Flow Examples**

### User Creation Flow

```
Frontend (Name Entry)
  → generateFingerprint()
  → POST /api/users with {name, last_initial, email, device_fingerprint}
  → Backend checks if slug exists
    → If exists: Return 409 with existing_user data
    → If not: Create user, create directories
  → Frontend handles response
    → 409: Show conflict resolution UI
    → 201: Save to localStorage, redirect to /booth
```

### Photo Capture Flow

```
Camera Component
  → User clicks capture button
  → Countdown component starts
  → On complete: capturePhoto() from video element
  → Emit blob to parent (single/+page.svelte)
  → Show preview
  → User clicks save
  → uploadPhoto() via API service
  → Backend receives multipart/form-data
  → processPhoto() with Sharp (3 versions)
  → Save to database + filesystem
  → Return URLs
  → Frontend redirects to /booth
```

---

## ⚠️ **Common Pitfalls for AI Agents**

### 1. Don't Change the Port Back to 3000
Port 3001 is intentional. Another service uses 3000.

### 2. Don't Re-enable Device Fingerprint Auto-Login
This breaks multi-user support on same device.

### 3. Static File Paths Must Be Absolute
The `@fastify/static` plugin requires absolute paths. Use `resolve()` from 'path'.

### 4. SvelteKit TypeScript Errors Are Normal
Until you run `npm run dev` in frontend, TypeScript will complain about `.svelte-kit/tsconfig.json` not existing. This is expected.

### 5. Database Path in .env is Relative
The `DATABASE_PATH` in .env is relative to the app directory:
- `.env`: `DATABASE_PATH=../data/photobooth.db`
- Resolves to: `G:\Grumpy Gears Dev\HHWeddingBooth\data\photobooth.db`

### 6. Phase 2 Routes Will 404
`/booth/multi` doesn't exist yet. This is expected - it's Phase 2.

---

## 🧪 **Testing Notes**

### How to Verify Phase 1 is Working

1. **Backend Health:** `curl http://localhost:3001/health`
2. **Create User:** Try creating a user in browser
3. **Take Photo:** Single photo mode should work end-to-end
4. **Gallery:** Photos should appear immediately
5. **Multiple Users:** Create 2-3 users, verify separate galleries
6. **Name Conflict:** Try creating same name twice, verify conflict resolution UI
7. **Database:** `sqlite3 data/photobooth.db` then `SELECT * FROM users;`
8. **Files:** Check `data/photos/{slug}/` directories exist

### Test Data Generated

During testing, these users were created:
- `hayden-m` - Has photos
- `meezy-m` - Has photos

These can be deleted from database if needed:
```sql
DELETE FROM photos WHERE user_id IN (SELECT id FROM users WHERE slug IN ('hayden-m', 'meezy-m'));
DELETE FROM users WHERE slug IN ('hayden-m', 'meezy-m');
```

---

## 📦 **Dependencies to Note**

### Backend

**Critical:**
- `better-sqlite3`: Synchronous SQLite binding (fast, simple)
- `sharp`: Image processing (must be installed with native bindings)
- `@fastify/multipart`: File upload handling

**Development:**
- `tsx`: TypeScript execution (hot reload in dev)

### Frontend  

**Critical:**
- `@sveltejs/adapter-static`: For PWA build
- `vite-plugin-pwa`: PWA manifest and service worker

**Development:**
- SvelteKit auto-generates `.svelte-kit/` directory on first run

---

## 🚀 **Ready for Phase 2**

The following are **already implemented** and ready to use in Phase 2:

✅ Session creation endpoint (`POST /api/sessions`)  
✅ Photo strip generation function (`imaging.ts::generateStrip()`)  
✅ Strip filename storage in sessions table  
✅ Session photos grouping (via `session_id` foreign key)  
✅ Session retrieval endpoint (`GET /api/sessions/:id`)  
✅ Generate strip endpoint (`POST /api/sessions/:id/generate-strip`)  

**What's needed:** Just the frontend UI for multi-shot mode!

---

## 💡 **Tips for Future Development**

### Adding a New Page

1. Create `frontend/src/routes/your-page/+page.svelte`
2. SvelteKit auto-routes it to `/your-page`
3. Use `goto('/your-page')` to navigate
4. Access via `<a href="/your-page">` or button click

### Adding a New API Endpoint

1. Add route function to appropriate file in `app/src/routes/`
2. Or create new route file and import in `app/src/index.ts`
3. Endpoints are prefixed with `/api` automatically
4. Use prepared statements from `database.ts`

### Database Changes

1. Modify schema in `app/src/services/database.ts`
2. Delete `data/photobooth.db*` files to recreate
3. Or write migration SQL manually

### Image Processing

All Sharp operations are in `app/src/services/imaging.ts`. Functions:
- `processPhoto()` - Creates 3 versions
- `generateStrip()` - Creates vertical strip from multiple photos

---

## 🎯 **Phase 2 Starting Point**

When you begin Phase 2, you'll need to:

1. Create `frontend/src/routes/booth/multi/+page.svelte`
2. Add configuration UI (photo count, timing sliders)
3. Implement sequential capture logic
4. Call existing session and strip generation APIs
5. Update gallery to display sessions/strips

The backend is **ready**. All APIs exist. It's purely frontend work.

---

**For detailed architecture:** See `photobooth-pwa-design-document.md`  
**For current status:** See `PROJECT_STATUS.md`  
**For testing:** See `PHASE1_TESTING_CHECKLIST.md`
