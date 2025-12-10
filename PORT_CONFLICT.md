# PORT CONFLICT DETECTED! ⚠️

## Problem Identified

Port 3000 is being used by a **different application** (an Express app), NOT our photo booth backend!

Evidence:
- Error mentions `/app/src/middleware/errorHandler.ts` 
- Error shows `express/lib/router` in stack trace
- Our app uses **Fastify**, not Express
- Error format `{success:false, error:{}}` doesn't match our error handler

## Solution: Use a Different Port

### Option 1: Change Our Backend Port (Recommended)

1. **Edit `app/.env`**:
   ```env
   PORT=3001
   ```
   (Change from 3000 to 3001)

2. **Edit `frontend/vite.config.js`**:
   Find the proxy configuration and change:
   ```javascript
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:3001',  // Change from 3000 to 3001
         changeOrigin: true
       },
       '/photos': {
         target: 'http://localhost:3001',  // Change from 3000 to 3001
         changeOrigin: true
       }
     }
   }
   ```

3. **Restart both servers**:
   - Backend: `cd app && npm run dev` (should now listen on 3001)
   - Frontend: Restart your Vite dev server

### Option 2: Stop the Other App

Find and stop whatever is running on port 3000:

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

Then start our backend:
```powershell
cd app
npm run dev
```

## How to Verify It's Our Backend

When OUR backend starts, you should see:
```
✅ Database initialized successfully
🚀 Photo Booth API Server Started
📡 Listening on http://0.0.0.0:3001  (or 3000 if you stopped the other app)
```

Then test:
```powershell
curl http://localhost:3001/health
```

Should return our format:
```json
{"status":"ok","timestamp":"2024-12-10T..."}
```

NOT the other app's format:
```json
{"success":false,"error":{...}}
```

## Recommended Action

**Use Option 1** (change to port 3001) - it's safer and won't interfere with your other app.
