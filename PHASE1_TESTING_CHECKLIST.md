# Phase 1 Testing Checklist ✅

Congratulations! Phase 1 is working! Here's what to test thoroughly before moving to Phase 2.

## ✅ Currently Working (Phase 1 Features)

### 1. User Creation & Management

- [x] Create new user with first name and last initial
- [ ] Test with different names (e.g., "Sarah M", "John D")
- [ ] Test email field (optional - leave blank or fill in)
- [ ] Test invalid inputs (empty name, special characters)
- [ ] Create multiple users and switch between them
- [ ] Test "Switch User" button from booth menu
- [ ] Verify returning user (same device) auto-logs in
- [ ] Test slug conflict (same name/initial on different device)
  - Clear localStorage and try creating "Sarah M" again
  - Should get conflict message

### 2. Single Photo Capture

- [ ] Click capture button starts countdown (3...2...1...)
- [ ] White flash effect appears on capture
- [ ] Photo preview shows correctly
- [ ] Mirrored preview (your left hand should appear on your right)
- [ ] "Retake" button works - returns to camera
- [ ] "Save Photo" button works - redirects to booth menu
- [ ] Photo appears in gallery immediately after save

### 3. Gallery Features

- [ ] Gallery shows all your photos
- [ ] Click on thumbnail opens fullscreen view
- [ ] Fullscreen view has close button (X)
- [ ] Press ESC to close fullscreen view
- [ ] Click anywhere to close fullscreen view
- [ ] "Back to Booth" button works
- [ ] Gallery is empty for new users
- [ ] Old users see their photos when they return

### 4. Navigation & UI

- [ ] Starry background animates smoothly
- [ ] Twinkling stars appear and fade
- [ ] Cards have glassmorphism effect
- [ ] Buttons have hover effects
- [ ] Wedding fonts load correctly (Great Vibes, Pinyon Script, Playfair Display)
- [ ] Page transitions work smoothly
- [ ] Mobile responsive (test on phone if possible)

### 5. Data Persistence

- [ ] Refresh browser - user still logged in
- [ ] Close and reopen browser - user still logged in
- [ ] Photos persist after browser close
- [ ] Multiple users maintain separate galleries

### 6. Database Verification

Check the database:
```powershell
sqlite3 data/photobooth.db
```

```sql
-- View all users
SELECT id, name, slug, email FROM users;

-- View all photos with user info
SELECT p.id, u.name, p.captured_at, p.filename_web 
FROM photos p 
JOIN users u ON p.user_id = u.id
ORDER BY p.captured_at DESC;

-- Count photos per user
SELECT u.name, COUNT(p.id) as photo_count
FROM users u
LEFT JOIN photos p ON u.id = p.user_id
GROUP BY u.id;

.exit
```

### 7. File System Verification

Check photos are being saved:
```powershell
# List all photo directories
Get-ChildItem -Path data/photos -Recurse | Select-Object FullName
```

Expected for each user:
```
data/photos/{slug}/
  original/{photo-id}.jpg  (full resolution)
  web/{photo-id}.jpg       (1920px max, 85% quality)
  thumb/{photo-id}.jpg     (400px, 80% quality)
```

### 8. API Testing (Direct)

Test endpoints directly:
```powershell
# Health check
curl http://localhost:3001/health

# Get user info
curl http://localhost:3001/api/users/sarah-m

# Get user's photos
curl http://localhost:3001/api/users/sarah-m/photos
```

### 9. Performance Testing

- [ ] Photo upload completes in < 3 seconds
- [ ] Gallery loads in < 2 seconds
- [ ] Camera starts in < 2 seconds
- [ ] No lag during countdown
- [ ] Image processing doesn't block UI

### 10. Edge Cases

- [ ] Test with slow internet (throttle in DevTools)
- [ ] Test with very long names (50 character limit)
- [ ] Test with names containing spaces
- [ ] Test with names containing numbers
- [ ] Take 10+ photos with one user
- [ ] Switch between users multiple times

## ❌ Not Yet Implemented (Phase 2 Features)

These will show 404 errors - that's expected:
- `/booth/multi` - Photo Booth mode (multi-shot)
- Photo strips
- Session management UI
- Multi-photo sequences

## 🐛 Known Issues to Ignore

- TypeScript errors in IDE (will resolve when .svelte-kit generates)
- "Unknown prop 'params'" warnings (SvelteKit internal, harmless)
- Missing audio files (countdown/shutter will be silent)
- Missing PWA icons (PWA install will fail, but Phase 3 feature)

## ✨ If Everything Works

You're ready for Phase 2! This would add:
- Multi-shot sequences (2-10 photos)
- Photo strip generation with overlay
- Configurable timing between shots
- Combined preview (grid + strip)

## 📊 Success Criteria for Phase 1

- [x] Users can create accounts
- [x] Users can take single photos
- [x] Photos are processed and stored
- [x] Users can view their personal gallery
- [x] Multiple users can use the app
- [x] Data persists across sessions
- [x] Beautiful UI with wedding theme

**If all checked above = Phase 1 Complete!** 🎉
