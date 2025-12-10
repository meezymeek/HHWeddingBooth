# Static Assets Setup Guide

## Overview

The photo booth app requires a few static assets to function fully. This guide will help you set them up.

## Required Files

### 1. Sound Effects (frontend/static/sounds/)

#### beep.mp3
- **Purpose**: Countdown timer sound
- **Duration**: 100-200ms
- **Status**: ⚠️ REQUIRED for audio feedback

#### shutter.mp3
- **Purpose**: Camera shutter sound  
- **Duration**: 200-300ms
- **Status**: ⚠️ REQUIRED for audio feedback

**Setup Instructions**: See `frontend/static/sounds/README.md`

### 2. Icons (frontend/static/icons/)

You'll need PWA icons in the following sizes:

#### icon-192.png
- **Size**: 192x192 pixels
- **Purpose**: Android home screen icon
- **Status**: ⚠️ REQUIRED for PWA installation

#### icon-512.png
- **Size**: 512x512 pixels
- **Purpose**: Android splash screen
- **Status**: ⚠️ REQUIRED for PWA installation

#### icon-maskable.png
- **Size**: 512x512 pixels
- **Purpose**: Adaptive icon for Android
- **Status**: ⚠️ REQUIRED for PWA installation
- **Requirements**: Must have safe zone padding (use https://maskable.app/ to check)

**Quick Icon Generation**:
1. Create or find a simple icon (camera emoji 📸 or wedding rings 💍)
2. Use https://realfavicongenerator.net/ to generate all sizes
3. Or use https://www.pwabuilder.com/imageGenerator for PWA icons

### 3. Favicon (frontend/static/)

#### favicon.png
- **Size**: 32x32 or 48x48 pixels
- **Purpose**: Browser tab icon
- **Status**: ⚠️ REQUIRED (currently referenced in app.html)

**Quick Favicon Creation**:
```powershell
# For now, you can use a simple emoji as favicon
# We'll replace it with a proper one later
```

## Testing Without Assets

The app will still function without these assets:
- ✅ Core functionality works
- ⚠️ No audio feedback (silent countdown/capture)
- ⚠️ PWA installation may not work properly
- ⚠️ Browser may show missing icon warnings

## Priority

For Phase 1 testing:
1. **HIGH**: favicon.png (prevents console errors)
2. **MEDIUM**: Sound files (for better UX, but not blocking)
3. **LOW**: PWA icons (needed for Phase 3 PWA features)

## Asset Checklist

- [ ] frontend/static/favicon.png
- [ ] frontend/static/sounds/beep.mp3
- [ ] frontend/static/sounds/shutter.mp3
- [ ] frontend/static/icons/icon-192.png
- [ ] frontend/static/icons/icon-512.png
- [ ] frontend/static/icons/icon-maskable.png

## Next Steps

Once you've added the assets:
1. Restart the frontend dev server
2. Check browser console for any missing file warnings
3. Test audio by capturing a photo
4. Verify PWA manifest in DevTools (Application tab)
