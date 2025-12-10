# Debugging Guide - Quick Fix for API Issues

## Current Issue: "Failed to create user"

The frontend is trying to call the backend API but getting an error. Let's debug step by step.

## Step 1: Restart Backend Server

Since we just updated the backend code, you need to restart it:

1. **Stop the current backend server** (Ctrl+C in the terminal running `npm run dev`)
2. **Start it again**:
   ```powershell
   cd app
   npm run dev
   ```

## Step 2: Verify Backend is Running

Test the health endpoint:
```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

## Step 3: Test API Direct (Without Frontend)

Test creating a user directly:
```powershell
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{\"name\":\"Test\",\"last_initial\":\"U\",\"device_fingerprint\":\"test123\"}'
```

If this works, you should see:
```json
{
  "id": "...",
  "name": "Test U",
  "slug": "test-u",
  "email": null,
  "is_new": true
}
```

## Step 4: Check Browser Console

In the browser (http://localhost:5173/):
1. Open DevTools (F12)
2. Go to Console tab
3. Try to create a user
4. Look for detailed error messages
5. Check Network tab to see the actual API request/response

### Common Errors & Solutions

#### Network Error / Failed to Fetch
**Problem**: Frontend can't reach backend
**Solution**: 
- Verify backend is running on port 3000
- Check Vite proxy configuration in `frontend/vite.config.js`
- Ensure no firewall blocking localhost:3000

#### CORS Error
**Problem**: "Access-Control-Allow-Origin" error
**Solution**:
- Backend CORS is configured for localhost:5173
- This should already be fixed in our code

#### 500 Internal Server Error
**Problem**: Backend crashed or database issue
**Solution**:
- Check backend terminal for error messages
- Verify database file exists and has write permissions
- Check `data/` directory permissions

#### TypeError: Cannot read properties
**Problem**: Missing fields in request
**Solution**:
- Check Network tab in DevTools
- Verify request body has: name, last_initial, device_fingerprint
- Our error handling should now show this

## Step 5: Backend Logs

When you try to create a user, watch the backend terminal. You should see:
```
[timestamp] INFO: POST /api/users
```

If you see an error, it will tell you exactly what's wrong.

## Quick Diagnostic Checklist

- [ ] Backend server is running (check terminal)
- [ ] Backend listening on http://0.0.0.0:3000 (or localhost:3000)
- [ ] Frontend dev server running on http://localhost:5173
- [ ] Browser console shows the actual error
- [ ] Network tab shows the API request

## Most Likely Issues

### Issue 1: Backend Not Restarted
You modified `app/src/index.ts` but didn't restart the server.
**Fix**: Stop and restart `npm run dev` in the app directory.

### Issue 2: Port Conflict
Another process is using port 3000.
**Fix**: Kill the process or change PORT in .env file.

### Issue 3: Database Lock
SQLite database is locked from previous run.
**Fix**: 
```powershell
Remove-Item data/photobooth.db-shm -ErrorAction SilentlyContinue
Remove-Item data/photobooth.db-wal -ErrorAction SilentlyContinue
```

## After Fixing

Once backend is restarted:
1. Refresh the frontend page (http://localhost:5173)
2. Try creating a user again
3. Check browser console for the actual API response
4. The improved error handling should now show the specific issue
