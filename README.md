# MZOBS Employer App

Expo (SDK 54, plain JS) app for employers/recruiters — the mobile counterpart of the employer website. Talks to `Backend/` at `/api/employer`.

```
npm install
npm start          # Expo Go / dev client
```

## Backend URL

- `EXPO_PUBLIC_API_URL` set → used as-is (production builds: `https://api.mzobs.com`, see `eas.json`).
- Not set → derived from the Metro host: `http://<your-LAN-ip>:4000` on a real phone, `localhost` / `10.0.2.2` on a simulator / Android emulator.

**Careful:** `Backend/.env` points at the Atlas cluster, so a local `npm run dev` backend is talking to real data. To test safely, run a second backend on a throwaway DB:

```
cd ../Backend
MONGO_URI=mongodb://localhost:27017/employer_app_scratch PORT=4100 node scripts/seed.js
MONGO_URI=mongodb://localhost:27017/employer_app_scratch PORT=4100 node server.js
# app: EXPO_PUBLIC_API_URL=http://<lan-ip>:4100 npm start
# login: admin@solacetech.dev / Passw0rd!123
```

Payments run in mock mode there (no Razorpay keys). Razorpay checkout needs a dev/production build, not Expo Go.
