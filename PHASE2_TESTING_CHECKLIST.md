# Phase 2 Testing Checklist - Multi-Shot Photo Booth Mode

**Date:** December 10, 2024  
**Feature:** Photo booth mode with sequential captures and photo strips  
**Status:** Ready for Testing

---

## 🎬 **Multi-Shot Booth Configuration**

### Configuration Screen (`/booth/multi`)

- [ ] Navigation from booth menu works
- [ ] Configuration screen displays properly
- [ ] Photo count slider works (2-10 photos)
  - [ ] Default is 4
  - [ ] Value updates in real-time
- [ ] Initial countdown slider works (1-10s)
  - [ ] Default is 3s
  - [ ] Value updates in real-time
- [ ] Between-shot delay slider works (0.5-5s, step 0.5)
  - [ ] Default is 1s
  - [ ] Value updates in real-time
- [ ] "Cancel" button returns to booth menu
- [ ] "Start Booth" button initiates session

---

## 📸 **Sequential Photo Capture**

### Session Creation

- [ ] API call to `POST /api/sessions` succeeds
- [ ] Session ID is received and stored
- [ ] Camera view loads after session creation

### First Photo

- [ ] Initial countdown displays (configured seconds)
- [ ] Countdown animation works
- [ ] Flash effect triggers on capture
- [ ] Photo is captured and stored
- [ ] Progress indicator shows "Photo 1 of X"
- [ ] First dot in progress bar becomes green (completed)

### Subsequent Photos

- [ ] Between-shot delay countdown displays
- [ ] "Next shot in Xs..." message appears
- [ ] Automatic capture triggers after delay
- [ ] No countdown for photos 2-N (instant after delay)
- [ ] Progress dots update correctly
- [ ] Current photo dot is white/active
- [ ] Completed photo dots are green

### Thumbnail Strip

- [ ] Thumbnails appear at bottom-left after each capture
- [ ] Thumbnails show in correct sequence order
- [ ] Thumbnails are properly sized and styled

### Multi-Photo Capture Scenarios

- [ ] **2 photos**: Works correctly
- [ ] **4 photos** (default): Works correctly
- [ ] **10 photos** (max): Works correctly
- [ ] **Long delay (5s)**: Countdown works without issues
- [ ] **Short delay (0.5s)**: Rapid capture works smoothly

---

## ✨ **Preview & Strip Generation**

### Upload Process

- [ ] All photos upload to backend with session_id
- [ ] Each photo has correct sequence_number (1, 2, 3...)
- [ ] Loading message displays: "Creating your photo strip..."
- [ ] Loading spinner animates

### Photo Strip Display

- [ ] Strip generation completes successfully
- [ ] Photo strip appears in preview
- [ ] Strip shows all photos in vertical layout
- [ ] Strip has proper white borders/margins
- [ ] Strip image quality is good

### Individual Photos Grid

- [ ] "Individual Photos" section appears below strip
- [ ] Grid shows all captured photos
- [ ] Photos maintain aspect ratio
- [ ] Hover effect works on grid photos

### Action Buttons

- [ ] "Retake All" button works
  - [ ] Returns to configuration screen
  - [ ] Clears previous session
  - [ ] Allows new session with same/different settings
- [ ] "Save to Gallery" button works
  - [ ] Redirects to booth menu
  - [ ] Photos appear in gallery
- [ ] "Back to Menu" button works

---

## 🖼️ **Gallery Integration**

### Gallery Display

- [ ] Navigate to personal gallery
- [ ] "Photo Booth Sessions" section appears (if sessions exist)
- [ ] Strip thumbnails display correctly
- [ ] Strip shows photo count (e.g., "4 photos")
- [ ] "Individual Photos" section separates single photos
- [ ] Photos without session_id show in individual section

### Strip Viewing

- [ ] Click strip thumbnail opens fullscreen viewer
- [ ] Strip displays in full quality
- [ ] Close button (X) works
- [ ] Click anywhere closes viewer
- [ ] ESC key closes viewer

---

## 🔄 **Error Handling**

### Network Errors

- [ ] Session creation failure shows error message
- [ ] Photo upload failure shows error message
- [ ] Strip generation failure shows error message
- [ ] Error messages are user-friendly

### Camera Errors

- [ ] Camera access denied shows error
- [ ] Camera disconnected during capture handled gracefully
- [ ] Multiple rapid captures don't break the flow

### Edge Cases

- [ ] Browser refresh during capture (loses session, expected)
- [ ] Back button during capture (returns to booth menu)
- [ ] Camera permissions revoked mid-session

---

## 🎨 **UI/UX Testing**

### Visual Design

- [ ] Configuration screen matches Phase 1 styling
- [ ] Sliders have consistent wedding theme
- [ ] Progress bar is visible and styled well
- [ ] Dots animation is smooth
- [ ] Preview screen has good layout
- [ ] Loading spinner is centered and visible

### Responsive Design

- [ ] Desktop view works (1920x1080)
- [ ] Tablet view works (1024x768)
- [ ] Mobile view works (if testing on phone)
- [ ] Strip image scales properly on different screens

### Performance

- [ ] No lag during countdown
- [ ] Photo capture is instant (no delay)
- [ ] Between-shot delay is accurate
- [ ] Upload/generation completes in reasonable time (<10s for 4 photos)

---

## 🔗 **Integration Testing**

### Full Workflow - Scenario 1: Default Settings

1. [ ] Login as user (or continue as existing user)
2. [ ] Click "Photo Booth" from booth menu
3. [ ] Keep default settings (4 photos, 3s, 1s)
4. [ ] Click "Start Booth"
5. [ ] Pose for 4 photos
6. [ ] Verify all 4 photos captured
7. [ ] Wait for strip generation
8. [ ] Preview looks good
9. [ ] Click "Save to Gallery"
10. [ ] Navigate to gallery
11. [ ] Verify strip and 4 individual photos appear

### Full Workflow - Scenario 2: Custom Settings

1. [ ] Start new session
2. [ ] Set 6 photos, 5s countdown, 2s delay
3. [ ] Complete capture sequence
4. [ ] Verify timing is correct
5. [ ] Verify 6-photo strip generates
6. [ ] Save and check gallery

### Full Workflow - Scenario 3: Retake

1. [ ] Start session with 3 photos
2. [ ] Complete all captures
3. [ ] Preview shows strip
4. [ ] Click "Retake All"
5. [ ] Returns to config screen
6. [ ] Change settings
7. [ ] Take new photos
8. [ ] Verify new session created (not overwriting previous)

### Multi-User Testing

1. [ ] User A creates session with 4 photos
2. [ ] Switch to User B
3. [ ] User B creates session with 2 photos
4. [ ] Both galleries show correct strips
5. [ ] No cross-contamination of photos

---

## 📁 **Backend Verification**

### Database

```sql
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;
-- Verify session records exist

SELECT * FROM photos WHERE session_id IS NOT NULL ORDER BY sequence_number;
-- Verify photos linked to sessions with sequence numbers

SELECT * FROM photos WHERE session_id IS NULL;
-- Verify single photos still work
```

### File System

- [ ] Check `data/photos/{slug}/strips/` directory exists
- [ ] Strip files are named correctly (e.g., `strip_session_{id}.jpg`)
- [ ] Strip files have reasonable file size (not too large)
- [ ] Individual photo files still created (original/web/thumb)

---

## 🐛 **Known Issues / Expected Behavior**

- TypeScript errors in IDE until dev server runs (expected)
- Countdown may show "0" briefly before capture (cosmetic, acceptable)
- Browser refresh during capture loses session (expected - no recovery)
- Strip generation takes 2-5 seconds for 4 photos (expected)

---

## ✅ **Acceptance Criteria**

For Phase 2 to be considered complete:

- [x] Configuration UI is intuitive and functional
- [x] Sequential capture works reliably
- [x] Photo strips generate correctly
- [x] Gallery displays both strips and individual photos
- [x] Error handling is present
- [x] UI matches Phase 1 design language
- [ ] All critical paths tested without blocking issues

---

## 🚀 **Testing Commands**

### Start Backend
```powershell
cd app
npm run dev
# Should start on http://localhost:3001
```

### Start Frontend
```powershell
cd frontend
npm run dev
# Should start on http://localhost:5173
```

### Check Backend Health
```powershell
curl http://localhost:3001/health
```

### View Logs
- Backend logs appear in terminal running `app`
- Frontend logs in browser console (F12)

---

## 📝 **Test Results**

**Tester:**  
**Date:**  
**Browser:**  
**OS:**  

### Summary

- Features tested: ___ / ___
- Passed: ___
- Failed: ___
- Blocked: ___

### Critical Issues Found

1. 
2. 
3. 

### Notes

---

**Status:** Ready for testing  
**Next Phase:** Phase 3 - PWA Features & Production Polish
