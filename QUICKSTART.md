# Quick Start - Fix API Issue

## Immediate Action Required

You're seeing "Failed to create user" because the backend needs to be restarted after our code changes.

### Step 1: Restart Backend (REQUIRED)

1. Go to the terminal running the backend
2. Press `Ctrl+C` to stop it
3. Restart with:
   ```powershell
   cd app
   npm run dev
   ```

Wait for this message:
```
🚀 Photo Booth API Server Started
📡 Listening on http://0.0.0.0:3000
```

### Step 2: Refresh Frontend

1. In your browser, go to http://localhost:5173
2. Hard refresh: `Ctrl+Shift+R` (or `Ctrl+F5`)

### Step 3: Test Again

1. Enter first name (e.g., "Sarah")
2. Enter last initial (e.g., "M")
3. Click "Let's Go! 📸"

This time you should see better error messages if something fails, or it should work!

## If Still Having Issues

### Check Backend Logs
Watch the backend terminal when you click submit. You should see:
```
INFO: POST /api/users
```

### Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try creating user
4. Click on the `/api/users` request
5. Check the Response - it will show the exact error

### Quick Test of Backend
In a new PowerShell window:
```powershell
curl http://localhost:3000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## What Changed

We added:
- Static file serving for photos
- Better error messages
- More detailed logging

These changes require a backend restart to take effect.
