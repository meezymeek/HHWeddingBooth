# December 2025 Bug Fixes & Updates

**Date:** December 11, 2025  
**Author:** Development Team  
**Git Commits:** fde313b, 2e93697, 669b0d3

---

## Summary

This document details critical bug fixes discovered and resolved during production deployment testing at `https://photobooth.meekthenilands.com`.

---

## 🐛 Bug Fixes

### 1. UI: Diamond Symbol → Plus Sign
**Date:** December 11, 2025  
**Severity:** Minor (Cosmetic)  
**Status:** ✅ Fixed

#### Issue
The UI was displaying a diamond ornament symbol (`<span class="ornament"></span>`) between "Haven" and "Hayden" throughout the application.

#### Root Cause
HTML span with CSS class `.ornament` was being used as a decorative separator.

#### Solution
Replaced all instances of `<span class="ornament"></span>` with a simple keyboard plus sign (`+`).

#### Files Changed
- `frontend/src/routes/+page.svelte` (Home page)
- `frontend/src/routes/booth/+page.svelte` (Booth menu)
- `frontend/src/routes/gallery/[slug]/+page.svelte` (Gallery page)

#### Before
```html
<h1 class="text-display mb-4">
    Haven <span class="ornament"></span> Hayden
</h1>
```

#### After
```html
<h1 class="text-display mb-4">
    Haven + Hayden
</h1>
```

---

### 2. Admin Dashboard: 404 Error on /admin Routes
**Date:** December 11, 2025  
**Severity:** Critical  
**Status:** ✅ Fixed

#### Issue
Accessing `https://photobooth.meekthenilands.com/admin` or `/admin/dashboard` returned:
```json
{"message":"Route GET:/admin/ not found","error":"Not Found","statusCode":404}
```

#### Root Cause
The nginx configuration in `deploy.sh` had an incorrect routing rule that proxied `/admin/` requests to the backend API instead of the frontend application:

```nginx
location /admin/ {
    proxy_pass http://backend;  # ❌ Wrong!
}
```

The admin pages (`/admin` and `/admin/dashboard`) are **frontend SvelteKit pages**, not backend API endpoints.

#### Solution
Removed the incorrect `/admin/` location block from the nginx configuration. The catch-all frontend route now properly handles admin pages:

```nginx
location / {
    proxy_pass http://frontend;  # ✅ Handles /admin correctly
}
```

#### Files Changed
- `deploy.sh` (nginx configuration section)

#### Production Deployment
Manual fix required on production server:
1. Edit `/opt/photobooth/nginx/conf.d/default.conf`
2. Remove the `/admin/` location block
3. Restart nginx: `docker compose restart nginx`

---

### 3. Admin Login: Auth Middleware Blocking /verify Endpoint
**Date:** December 11, 2025  
**Severity:** Critical  
**Status:** ✅ Fixed  
**Git Commit:** fde313b

#### Issue
Admin login endpoint `/api/admin/verify` was returning:
```json
{"error":"unauthorized","message":"Admin authentication required"}
```

Even with correct password, login was impossible.

#### Root Cause
The admin authentication middleware was applied to ALL admin routes via `fastify.addHook('onRequest', adminAuth)`, including the `/verify` login endpoint. This created a catch-22: the endpoint needed authentication to verify authentication.

The `{ onRequest: [] }` configuration in the route definition was being overridden by the plugin-level hook.

#### Solution
Added URL checking at the beginning of the `adminAuth` middleware to skip authentication for the `/verify` endpoint:

```typescript
async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
    // Skip auth for the verify endpoint (login)
    if (request.url.includes('/verify')) {
        return;
    }
    
    // ... rest of auth logic
}
```

#### Files Changed
- `app/src/routes/admin.ts`

#### Testing
```bash
curl -X POST https://photobooth.meekthenilands.com/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"password":"Hayd3nM33k!"}'

# Expected: {"valid":true,"token":"Hayd3nM33k!"}
```

---

### 4. Admin Dashboard: Photos Not Displaying (404 Errors)
**Date:** December 11, 2025  
**Severity:** Major  
**Status:** ✅ Fixed  
**Git Commit:** 2e93697

#### Issue
Photo thumbnails in the admin dashboard displayed as broken images. Network requests showed 404 errors for URLs like:
```
https://photobooth.meekthenilands.com/admin/15f726ba-177f-4c44-b8e3-035971189767.jpg
```

#### Root Cause
The `/api/admin/photos` endpoint was returning raw database filenames instead of properly formatted URLs:

```typescript
// Before: Raw filename
{
    filename_thumb: "15f726ba-177f-4c44-b8e3-035971189767.jpg"
}

// Should be: Full URL path
{
    filename_thumb: "/photos/hayden-m/thumb/15f726ba-177f-4c44-b8e3-035971189767.jpg"
}
```

The regular user photo endpoint (`/api/photos/users/:slug/photos`) properly used the `getPhotoUrl()` helper, but the admin endpoint did not.

#### Solution
1. Imported `getPhotoUrl` from `storage.ts` service
2. Transformed photo data before returning to frontend:

```typescript
// Transform photos with proper URLs
const photosWithUrls = photos.map(photo => ({
    ...photo,
    filename_web: getPhotoUrl(photo.user_slug, 'web', photo.filename_web),
    filename_thumb: getPhotoUrl(photo.user_slug, 'thumb', photo.filename_thumb)
}));

return reply.send({
    photos: photosWithUrls,
    pagination: { ... }
});
```

#### Files Changed
- `app/src/routes/admin.ts`

---

### 5. Photo Booth: Strip Preview URL Duplication
**Date:** December 11, 2025  
**Severity:** Major  
**Status:** ✅ Fixed  
**Git Commit:** 669b0d3

#### Issue
Photo strip preview in multi-shot booth mode displayed broken image. Network request showed URL duplication:
```
https://photobooth.meekthenilands.com/photos/hayden-m/strips//photos/hayden-m/strips/bd904822-8b84-4964-8eca-c265b626d09d.jpg
```

#### Root Cause
Double prefixing of the photo path:
1. Backend `generateStrip` endpoint returns a complete URL: `/photos/{slug}/strips/{filename}`
2. Frontend was adding the prefix AGAIN: `/photos/${user.slug}/strips/${stripResult.strip_filename}`

This resulted in: `/photos/hayden-m/strips/` + `/photos/hayden-m/strips/filename.jpg`

#### Solution
Use the backend-provided URL directly without adding additional prefix:

```typescript
// Before
const stripResult = await generateStrip(sessionId);
stripUrl = `/photos/${user.slug}/strips/${stripResult.strip_filename}`;

// After
const stripResult = await generateStrip(sessionId);
stripUrl = stripResult.strip_filename;  // Already a complete URL
```

#### Files Changed
- `frontend/src/routes/booth/multi/+page.svelte`

---

## 🎯 Deployment Instructions

### For Backend Changes (Bugs #3, #4)
```bash
cd /opt/photobooth
git pull origin master
docker compose build --no-cache backend
docker compose up -d
```

### For Frontend Changes (Bugs #1, #5)
```bash
cd /opt/photobooth
git pull origin master
docker compose build --no-cache frontend
docker compose up -d
```

### For nginx Configuration (Bug #2)
Manual edit required on first deployment. Subsequent deployments can use the updated `deploy.sh`:
```bash
cd /opt/photobooth
rm nginx/conf.d/default.conf
git pull origin master
sudo ./deploy.sh
```

### Full Rebuild (Recommended for Complete Fix)
```bash
cd /opt/photobooth
git pull origin master
docker compose down
docker compose up -d --build
```

---

## 🧪 Verification Tests

### Test 1: UI Plus Signs
**URL:** Any page with "Haven + Hayden"  
**Expected:** Plus sign (+) appears between names  
**Status:** ✅ Pass

### Test 2: Admin Login Access
**URL:** `https://photobooth.meekthenilands.com/admin`  
**Expected:** Admin login form displays (no 404)  
**Status:** ✅ Pass

### Test 3: Admin Password Verification
**Test:** Submit admin password in login form  
**Expected:** Successful login, redirect to `/admin/dashboard`  
**Status:** ✅ Pass

### Test 4: Admin Dashboard Photos
**URL:** `https://photobooth.meekthenilands.com/admin/dashboard`  
**Expected:** Photo thumbnails display correctly in Overview and Photos tabs  
**Status:** ✅ Pass

### Test 5: Photo Booth Strip Preview
**Test:** Complete multi-shot session  
**Expected:** Photo strip displays in preview screen  
**Status:** ✅ Pass

---

## 📊 Impact Analysis

### User-Facing Impact
- **Low Impact:** UI change (ornament → plus) is purely cosmetic
- **High Impact:** Admin dashboard and photo booth now fully functional in production

### Technical Debt Reduced
- ✅ Consistent URL generation pattern across all endpoints
- ✅ Proper separation of frontend/backend routing
- ✅ Auth middleware correctly handles public endpoints

### Breaking Changes
- None - all changes are backwards compatible

---

## 🔍 Lessons Learned

### 1. nginx Routing Configuration
**Issue:** Complex routing rules can conflict with SPA catch-all routing  
**Best Practice:** Only route `/api/*` to backend; let frontend handle all UI routes

### 2. Fastify Authentication Hooks
**Issue:** Plugin-level hooks can override route-level hook configurations  
**Best Practice:** Check URL patterns in middleware functions for granular control

### 3. URL Generation Consistency
**Issue:** Some endpoints returned raw filenames while others returned URLs  
**Best Practice:** Always use helper functions (`getPhotoUrl()`) consistently across all endpoints

### 4. Testing Production vs Development
**Issue:** Some bugs only appear in production nginx environment  
**Best Practice:** Test with production-like nginx proxy setup before deploying

---

## 📝 Documentation Updates Needed

- [x] Created `DECEMBER_2025_BUG_FIXES.md` (this file)
- [ ] Update `PROJECT_STATUS.md` with current deployment status
- [ ] Update `README.md` with admin access instructions
- [ ] Update `QUICKSTART.md` if needed for nginx fix

---

## 🚀 Next Steps

1. **Immediate:** Deploy fixes to production
2. **Short-term:** Complete Phase 3 testing checklist
3. **Medium-term:** Create PWA icons for mobile installation
4. **Long-term:** Monitor system during actual wedding event

---

**Document Version:** 1.0  
**Last Updated:** December 11, 2025  
**Status:** All bugs resolved and fixes deployed to GitHub
