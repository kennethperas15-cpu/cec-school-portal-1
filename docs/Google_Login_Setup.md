# Google Login Setup (5 minutes, free)

The portal's Google sign-in is fully coded — it only needs your Google Cloud
Client ID. Nobody else can create this for you (it lives in your Google account).

## 1. Create the Client ID
1. Go to https://console.cloud.google.com/apis/credentials
2. Create/select a project (e.g. `cec-portal`), then
   **Create Credentials → OAuth client ID → Web application**.
3. Under **Authorized JavaScript origins** add:
   - `http://127.0.0.1:5173`
   - `http://localhost:5173`
4. Copy the **Client ID** (ends with `.apps.googleusercontent.com`).

## 2. Client (portal UI)
Create `clients/.env` (copy from `clients/.env.example`) with:
```env
VITE_GOOGLE_CLIENT_ID=paste-your-client-id-here
VITE_API_URL=/api
```
Restart the client dev server (`npm run dev`).

## 3. Server (verification + auto-provisioning)
Add to `server/.env`:
```env
GOOGLE_CLIENT_ID=paste-your-client-id-here
```
Restart the API server (`npx tsx src/index.ts`).
Endpoint: `POST /api/auth/google/id-token` verifies the Google ID token,
logs into the matching account, or auto-provisions a new **student**
account for first-time Gmail users.

## 4. Test
1. Open `http://127.0.0.1:5173/cec-school-portal-1/`
2. The official **Sign in with Google** button appears on the login page.
3. Pick any Gmail → you enter the portal (loading screen → dashboard).

## Thesis demo without Google Cloud
If the Client ID isn't set, the login page shows a setup hint and all
demo accounts (`CEC-2024-0015` / `T-001` / `ADMIN`) plus offline-issued
accounts keep working.
