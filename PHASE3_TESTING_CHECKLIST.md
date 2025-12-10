# Phase 3 Testing Checklist - Production Polish & Reliability

**Created:** December 10, 2024  
**Phase:** Phase 3 (Offline Support, Email, Admin Dashboard)  
**Test Environment:** Development (localhost)

---

## 🎯 Testing Overview

This checklist covers testing for:
1. **Offline Support** - Photo queuing and background sync
2. **Email Delivery** - Individual and bulk email sending
3. **Admin Dashboard** - Management interface and bulk operations
4. **PWA Features** - Installation and service worker
5. **Production Readiness** - Error handling and performance

---

## ⚙️ Pre-Test Setup

### Backend Configuration

1. **Verify .env file exists:**
   ```powershell
   cd app
   Get-Content .env
   ```

2. **Required environment variables:**
   ```env
   PORT=3001
   DATABASE_PATH=../data/photobooth.db
   PHOTOS_PATH=G:\Grumpy Gears Dev\HHWeddingBooth\data\photos
   PUBLIC_URL=http://localhost:5173
   ADMIN_PASSWORD=test-admin-123
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-specific-password
   ```

3. **Setup Gmail App Password:**
   - Go to Google Account → Security
   - Enable 2-Factor Authentication
   - Generate App Password for "Mail"
   - Use in GMAIL_APP_PASSWORD

### Start Development Servers

```powershell
# Terminal 1 - Backend
cd app
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Verify Health

- Backend: http://localhost:3001/health
- Frontend: http://localhost:5173

---

## 🔌 OFFLINE SUPPORT TESTING

### Test 1: Offline Photo Capture (Single Photo)

**Steps:**
1. Open http://localhost:5173
2. Create/login as test user (e.g., "Test User")
3. Go to "Single Photo" mode
4. **Open DevTools → Network tab → Select "Offline"**
5. Capture a photo
6. Click "Save Photo"
7. **Verify:** Yellow "You're offline" banner appears
8. **Verify:** Photo doesn't appear in gallery yet
9. **Open DevTools → Application → IndexedDB → photobooth-offline → pending-photos**
10. **Verify:** Photo blob is stored with retry_count = 0

**Expected Result:**
- ✅ Photo captured successfully while offline
- ✅ Offline banner shows "1 photo will sync when connected"
- ✅ Photo queued in IndexedDB
- ✅ User redirected to booth menu

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 2: Auto Sync on Reconnect

**Prerequisites:** Test 1 completed with queued photo

**Steps:**
1. While still in browser, **set Network to "Online"**
2. **Verify:** Offline banner changes to blue "Syncing..." banner
3. **Watch console** for sync log messages
4. After ~2 seconds, **verify:** Banner disappears
5. Go to "My Photos" gallery
6. **Verify:** Photo now appears in gallery

**Expected Result:**
- ✅ Auto-sync triggers on connection restore
- ✅ Photo uploads successfully
- ✅ Photo removed from IndexedDB queue
- ✅ Photo visible in gallery

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 3: Multiple Photos Offline Queue

**Steps:**
1. **Set Network to "Offline"**
2. Capture 3 photos in single mode
3. **Verify:** Banner shows "3 photos will sync when connected"
4. **Verify:** IndexedDB has 3 photos
5. **Set Network to "Online"**
6. **Verify:** Photos sync in FIFO order (check console timestamps)
7. **Verify:** All 3 photos appear in gallery

**Expected Result:**
- ✅ Multiple photos queue correctly
- ✅ Counter updates accurately
- ✅ FIFO sync order maintained
- ✅ All photos uploaded successfully

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 4: Manual "Sync Now" Button

**Prerequisites:** Have 1+ photos queued offline

**Steps:**
1. **Set Network to "Online"**
2. **Verify:** Blue banner appears with "Sync Now" button
3. Click "Sync Now"
4. **Verify:** Button changes to "Syncing..." with spinner
5. **Verify:** Photos upload
6. **Verify:** Banner disappears after sync

**Expected Result:**
- ✅ Manual sync button works
- ✅ UI feedback during sync
- ✅ Photos upload successfully

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 5: Multi-Shot Offline Queue

**Steps:**
1. **Set Network to "Offline"**
2. Go to "Photo Booth" mode
3. Configure: 4 photos, 3s initial, 1s delay
4. Start booth and capture all 4 photos
5. **Verify:** All 4 photos queue in IndexedDB
6. **Verify:** Banner shows "4 photos will sync when connected"
7. **Note:** Strip preview won't show (expected when offline)
8. **Set Network to "Online"**
9. **Verify:** All 4 photos sync
10. Go to gallery
11. **Verify:** Photo strip appears after sync

**Expected Result:**
- ✅ Multi-shot works offline
- ✅ All photos queue correctly
- ✅ Photos sync when online
- ✅ Strip generates after sync (may need refresh)

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 6: Offline Persistence

**Steps:**
1. **Set Network to "Offline"**
2. Capture 2 photos
3. **Close the browser tab**
4. **Reopen** http://localhost:5173
5. **Verify:** IndexedDB still has 2 photos
6. **Verify:** Banner shows "2 photos waiting to sync"
7. **Set Network to "Online"**
8. **Verify:** Photos sync automatically

**Expected Result:**
- ✅ Offline queue persists across sessions
- ✅ Auto-sync on app restart when online

**Status:** ⬜ Pass / ⬜ Fail

---

## 📧 EMAIL DELIVERY TESTING

### Prerequisites

- Gmail App Password configured in .env
- At least one test user with valid email address

### Test 7: Individual Email Send

**Steps:**
1. Create user with YOUR email address
2. Capture 2-3 photos (single mode)
3. Go to "My Photos" gallery
4. **Verify:** "Email My Photos" button appears
5. **Verify:** Shows "Send to: your-email@gmail.com"
6. Click "Email My Photos"
7. **Verify:** Button shows "Sending..."
8. Wait for success message
9. **Check your email inbox**
10. **Verify:** Email received with:
    - Subject: "Your photos from Haven & Hayden's wedding! 📸"
    - Wedding branding
    - Photo attachments
    - Gallery link works

**Expected Result:**
- ✅ Email button appears for users with email
- ✅ Email sends successfully
- ✅ Email formatted correctly
- ✅ Photos attached
- ✅ Gallery link valid

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 8: Email with Photo Strip

**Steps:**
1. Capture a photo booth session (4 photos)
2. Go to gallery
3. Click "Email My Photos"
4. Check email
5. **Verify:** Email contains:
    - Individual photos as attachments
    - photo-strip.jpg attachment
    - All images viewable

**Expected Result:**
- ✅ Strip included in email
- ✅ All attachments downloadable

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 9: Email Error Handling

**Steps:**
1. Create user WITHOUT email address
2. Capture photos
3. Go to gallery
4. **Verify:** "Email My Photos" button does NOT appear
5. Try to send email via API directly (curl):
   ```powershell
   curl -X POST http://localhost:3001/api/users/test-user/send-email
   ```
6. **Verify:** Returns 400 error "no_email"

**Expected Result:**
- ✅ Button hidden for users without email
- ✅ API returns appropriate error

**Status:** ⬜ Pass / ⬜ Fail

---

## 👤 ADMIN DASHBOARD TESTING

### Test 10: Admin Login

**Steps:**
1. Navigate to http://localhost:5173/admin
2. **Verify:** Login screen appears
3. Enter WRONG password
4. **Verify:** "Invalid password" error
5. Enter CORRECT password (from .env: ADMIN_PASSWORD)
6. **Verify:** Redirects to /admin/dashboard

**Expected Result:**
- ✅ Login form works
- ✅ Wrong password rejected
- ✅ Correct password accepted
- ✅ Session persists (refresh doesn't logout)

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 11: Admin Overview

**Steps:**
1. Login to admin dashboard
2. **Verify Overview tab shows:**
   - Total Users (correct count)
   - Total Photos (correct count)
   - Photo Booth Sessions (correct count)
   - Users with Email (correct count)
3. **Verify:** Recent photos grid displays
4. **Verify:** Photos show correct user names

**Expected Result:**
- ✅ Stats display correctly
- ✅ Recent photos visible
- ✅ Data matches database

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 12: Admin Users List

**Steps:**
1. Click "Users" tab
2. **Verify:** Table shows all users
3. **Verify:** Columns show: Name, Email, Photos, Sessions, Last Active
4. Click "View Gallery" for a user
5. **Verify:** Opens user's gallery in new tab

**Expected Result:**
- ✅ All users listed
- ✅ Data accurate
- ✅ Gallery links work

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 13: Admin Photos List

**Steps:**
1. Click "Photos" tab
2. **Verify:** Grid shows thumbnails
3. **Verify:** Each photo shows user name and date
4. **Verify:** Photos from multiple users visible

**Expected Result:**
- ✅ Photo grid displays
- ✅ Metadata correct
- ✅ Thumbnails load

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 14: Bulk Download (ZIP)

**Steps:**
1. Go to Overview tab
2. Select quality: "Web (Compressed)"
3. Click "Download ZIP"
4. **Verify:** ZIP file downloads
5. Extract ZIP
6. **Verify:** Structure:
   ```
   photobooth-photos-{timestamp}.zip
   ├── user1-slug/
   │   ├── photo1.jpg
   │   ├── photo2.jpg
   │   └── strips/
   │       └── session1.jpg
   ├── user2-slug/
   │   └── photo3.jpg
   ```
7. **Verify:** All photos present
8. Test with "Original (Full Resolution)"
9. **Verify:** Files are larger (higher quality)

**Expected Result:**
- ✅ ZIP downloads successfully
- ✅ Correct folder structure
- ✅ All photos included
- ✅ Quality setting works

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 15: Bulk Email Send

**Prerequisites:** 2+ users with email addresses

**Steps:**
1. Login to admin
2. Go to Overview tab
3. Note "Users with Email" count (e.g., 3)
4. Click "Send Bulk Emails"
5. **Verify:** Confirmation dialog appears
6. Confirm send
7. **Verify:** Button shows "Sending..."
8. Wait for completion
9. **Verify:** Success message shows:
   - ✅ Sent: 3
   - ❌ Failed: 0
10. Check all recipient inboxes
11. **Verify:** All users received their photos

**Expected Result:**
- ✅ Bulk send works
- ✅ Each user gets their own photos only
- ✅ Success/fail counts accurate

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 16: Admin Session Persistence

**Steps:**
1. Login to admin
2. Navigate around dashboard (switch tabs)
3. **Refresh the page**
4. **Verify:** Still logged in (sessionStorage persists)
5. Click "Logout"
6. **Verify:** Redirected to /admin login
7. **Verify:** Can't access /admin/dashboard without login

**Expected Result:**
- ✅ Session persists on refresh
- ✅ Logout works
- ✅ Auth required for dashboard

**Status:** ⬜ Pass / ⬜ Fail

---

## 📱 PWA TESTING

### Test 17: PWA Installation (Desktop)

**Prerequisites:** PWA icons created (see ICONS_NEEDED.md)

**Steps:**
1. Open http://localhost:5173 in Chrome
2. Look for install icon in address bar (⊕ or ⬇)
3. Click install
4. **Verify:** App installs as standalone window
5. **Verify:** App icon shows correctly
6. Close and reopen PWA
7. **Verify:** Loads correctly

**Expected Result:**
- ✅ PWA installable
- ✅ Icons display
- ✅ Standalone mode works

**Status:** ⬜ Pass / ⬜ Fail (or N/A if icons not created)

---

### Test 18: Service Worker Caching

**Steps:**
1. Open http://localhost:5173
2. **DevTools → Application → Service Workers**
3. **Verify:** Service worker registered and activated
4. **DevTools → Application → Cache Storage**
5. **Verify:** Caches exist:
   - workbox-precache-v2-... (app shell)
   - google-fonts-cache
   - api-cache
6. Navigate app (take photo, view gallery)
7. **Verify:** Additional caches appear:
   - photo-thumbnails-cache
   - photo-images-cache

**Expected Result:**
- ✅ Service worker active
- ✅ Precache populated
- ✅ Runtime caches working

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 19: Offline App Shell

**Steps:**
1. Visit app while online
2. Navigate through all pages
3. **Set Network to "Offline"**
4. **Refresh the page**
5. **Verify:** App still loads (from cache)
6. **Verify:** UI appears, even if data doesn't load
7. Try to capture photo offline
8. **Verify:** Camera works and photo queues

**Expected Result:**
- ✅ App shell loads offline
- ✅ Basic functionality works
- ✅ Offline capture works

**Status:** ⬜ Pass / ⬜ Fail

---

## 🚨 ERROR HANDLING TESTING

### Test 20: Network Error During Upload

**Steps:**
1. Start capturing a photo
2. While uploading, **set Network to "Offline"**
3. **Verify:** Error message displays
4. **Verify:** Photo queues for retry
5. Go back online
6. **Verify:** Photo syncs automatically

**Expected Result:**
- ✅ Graceful error handling
- ✅ No data loss
- ✅ Retry works

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 21: Email Send Failure

**Steps:**
1. Temporarily set INVALID Gmail credentials in .env
2. Restart backend
3. Try to send email
4. **Verify:** User-friendly error message
5. **Verify:** Doesn't crash app

**Expected Result:**
- ✅ Error caught gracefully
- ✅ User informed of failure

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 22: Admin Auth Failure

**Steps:**
1. Logout of admin
2. Try to access http://localhost:5173/admin/dashboard directly
3. **Verify:** Redirected to /admin login
4. Try API call without token:
   ```powershell
   curl http://localhost:3001/api/admin/users
   ```
5. **Verify:** Returns 401 unauthorized

**Expected Result:**
- ✅ Dashboard protected
- ✅ API auth required

**Status:** ⬜ Pass / ⬜ Fail

---

## ⚡ PERFORMANCE & STRESS TESTING

### Test 23: Large Photo Upload

**Steps:**
1. Take photo with high-res camera (or use test image >10MB)
2. Upload to photo booth
3. **Verify:** Upload completes successfully
4. **Verify:** Processing time reasonable (<5 seconds)
5. Check generated files:
   - Original: Full size
   - Web: ~200-500KB
   - Thumbnail: ~50-100KB

**Expected Result:**
- ✅ Large photos handled
- ✅ Sharp processing works
- ✅ File sizes appropriate

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 24: Stress Test - 50+ Photos

**Steps:**
1. Create 3-4 test users
2. Capture 15-20 photos per user (mix single & multi-shot)
3. **Verify:** App remains responsive
4. Go to admin dashboard
5. **Verify:** Stats accurate
6. **Verify:** Photo grid loads
7. Try bulk download
8. **Verify:** ZIP creates successfully (may take time)
9. **Check:** Disk space usage in data/photos/

**Expected Result:**
- ✅ App handles large dataset
- ✅ No memory leaks
- ✅ ZIP generation works
- ✅ Storage organized properly

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 25: Concurrent Users

**Steps:**
1. Open app in 2 different browsers (Chrome + Firefox)
2. Create different users in each
3. Capture photos simultaneously
4. **Verify:** No conflicts
5. **Verify:** Photos save to correct user folders
6. **Verify:** Galleries show correct photos

**Expected Result:**
- ✅ Multi-user concurrent access works
- ✅ No data mixing
- ✅ SQLite handles concurrent writes

**Status:** ⬜ Pass / ⬜ Fail

---

## ✨ UI/UX TESTING

### Test 26: Loading States

**Steps:**
1. Check ALL async operations have loading indicators:
   - Photo upload: "Saving..." button text
   - Email send: "Sending..." button text
   - Admin data load: "Loading..." screen
   - Strip generation: Spinner with message
2. **Verify:** User never sees frozen UI

**Expected Result:**
- ✅ All loading states present
- ✅ Clear user feedback

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 27: Responsive Design

**Steps:**
1. **Mobile:** Open in Chrome DevTools mobile view (iPhone 12)
2. Test full flow: name entry → capture → gallery
3. **Tablet:** iPad Pro view
4. Test photo booth mode
5. **Desktop:** Full screen
6. Test admin dashboard
7. **Verify:** All layouts work on all sizes

**Expected Result:**
- ✅ Mobile-friendly
- ✅ Tablet-optimized
- ✅ Desktop usable

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 28: Offline Indicator Visibility

**Steps:**
1. Start online
2. **Verify:** No banner shows
3. Go offline
4. **Verify:** Yellow banner appears at top
5. Capture photos
6. **Verify:** Banner updates with count
7. Go online
8. **Verify:** Banner changes to blue "Syncing..."
9. After sync
10. **Verify:** Banner disappears

**Expected Result:**
- ✅ Indicators contextually appropriate
- ✅ Smooth transitions
- ✅ Clear messaging

**Status:** ⬜ Pass / ⬜ Fail

---

## 🔒 SECURITY TESTING

### Test 29: Admin Password Protection

**Steps:**
1. Check .env has ADMIN_PASSWORD set
2. Try accessing admin endpoints without auth:
   ```powershell
   curl http://localhost:3001/api/admin/users
   ```
3. **Verify:** Returns 401
4. Try with wrong password:
   ```powershell
   curl -H "Authorization: Bearer wrong-password" http://localhost:3001/api/admin/users
   ```
5. **Verify:** Returns 403
6. Try with correct password
7. **Verify:** Returns user list

**Expected Result:**
- ✅ Auth required
- ✅ Wrong password rejected
- ✅ Correct password works

**Status:** ⬜ Pass / ⬜ Fail

---

### Test 30: Rate Limiting

**Steps:**
1. Make 150 rapid API requests (use script or curl loop)
2. **Verify:** After ~100 requests, returns 429 Too Many Requests
3. Wait 1 minute
4. **Verify:** Requests work again

**Expected Result:**
- ✅ Rate limiting active
- ✅ Protects against abuse

**Status:** ⬜ Pass / ⬜ Fail

---

## 🎨 CROSS-BROWSER TESTING

### Test 31: Browser Compatibility

**Test in each browser:**
- [ ] Chrome (Windows)
- [ ] Firefox (Windows)
- [ ] Edge (Windows)
- [ ] Safari (macOS/iOS) - if available
- [ ] Chrome Mobile (Android)

**For each browser:**
1. Test camera access
2. Test photo capture
3. Test offline functionality
4. Test email send
5. **Note any issues**

**Expected Result:**
- ✅ Works in all major browsers
- 📝 Known issues documented

**Status:** ⬜ Pass / ⬜ Fail

---

## 📊 DATABASE TESTING

### Test 32: Data Integrity

**Steps:**
1. After completing tests, check database:
   ```powershell
   cd data
   sqlite3 photobooth.db
   ```

2. Run queries:
   ```sql
   -- Count users
   SELECT COUNT(*) FROM users;
   
   -- Count photos
   SELECT COUNT(*) FROM photos;
   
   -- Check for orphaned photos
   SELECT COUNT(*) FROM photos WHERE user_id NOT IN (SELECT id FROM users);
   
   -- Check sessions
   SELECT * FROM sessions;
   
   -- Check foreign key integrity
   PRAGMA foreign_key_check;
   ```

3. **Verify:**
   - No orphaned records
   - Foreign keys valid
   - Counts match UI

**Expected Result:**
- ✅ Database integrity maintained
- ✅ No orphaned data

**Status:** ⬜ Pass / ⬜ Fail

---

## 🎉 WEDDING DAY SIMULATION

### Test 33: Full Wedding Scenario

**Simulate realistic wedding usage:**

1. **15 minutes:** Create 10 users, mix of with/without email
2. **Capture:** 
   - 5 single photos
   - 3 photo booth sessions (4 photos each)
   - 2 more single photos
3. **During captures:** Randomly toggle online/offline
4. **Verify:** All photos captured and synced
5. **Admin:** Send bulk emails
6. **Verify:** Emails sent to users with addresses
7. **Admin:** Download all photos as ZIP
8. **Verify:** ZIP contains all photos
9. **Check:** Server logs for errors
10. **Check:** Database for inconsistencies

**Expected Result:**
- ✅ Handles realistic load
- ✅ No errors or crashes
- ✅ All features work together
- ✅ Data accurate

**Status:** ⬜ Pass / ⬜ Fail

---

## 📋 TEST SUMMARY

### Pass/Fail Overview

| Category | Tests | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Offline Support | 6 | ⬜ | ⬜ | ⬜ |
| Email Delivery | 3 | ⬜ | ⬜ | ⬜ |
| Admin Dashboard | 7 | ⬜ | ⬜ | ⬜ |
| PWA Features | 3 | ⬜ | ⬜ | ⬜ |
| Error Handling | 3 | ⬜ | ⬜ | ⬜ |
| Performance | 3 | ⬜ | ⬜ | ⬜ |
| UI/UX | 3 | ⬜ | ⬜ | ⬜ |
| Security | 2 | ⬜ | ⬜ | ⬜ |
| Cross-Browser | 1 | ⬜ | ⬜ | ⬜ |
| Database | 1 | ⬜ | ⬜ | ⬜ |
| Integration | 1 | ⬜ | ⬜ | ⬜ |
| **TOTAL** | **33** | **0** | **0** | **0** |

### Blocking Issues

_Document any issues that prevent wedding day deployment:_

1. 
2. 
3. 

### Known Issues (Non-Blocking)

_Document issues that are acceptable for wedding day:_

1. 
2. 
3. 

---

## 🚀 GO/NO-GO DECISION

### Critical Requirements for Wedding Day

- [ ] Offline photo capture works
- [ ] Photos sync when connection restores
- [ ] Email delivery functional (tested with real emails)
- [ ] Admin can download all photos
- [ ] Multi-user support works
- [ ] No data loss scenarios
- [ ] App stable under load

### Phase 3 Completion Criteria

- [ ] All high-priority tests pass
- [ ] No blocking issues remain
- [ ] Email configuration verified
- [ ] Admin dashboard functional
- [ ] PWA installable (if icons ready)

**Final Verdict:** ⬜ READY FOR WEDDING / ⬜ NEEDS MORE WORK

**Tester Name:** ____________________  
**Test Date:** ____________________  
**Approval:** ____________________

---

## 📝 NOTES

### Test Environment

- OS: Windows 11
- Browsers Tested: 
- Backend Version: 
- Frontend Version: 

### Issues Encountered

_Use this section for notes during testing:_

---

**END OF CHECKLIST**
