# HackMTY2025  Smart Execution Hub (Prototype)

This repository contains the HackMTY 2025 prototype: a small Smart Execution Hub with a Node/Express backend and a React + TypeScript frontend. It demonstrates bottle decision rules, realtime error detection from sensor readings, and an employee efficiency dashboard.

Quick overview
- backend/: Express API (bottle decisions, error detection, efficiency endpoints).
- frontend/: React + TypeScript UI that consumes the API and exposes dashboards and tools.
- powerBI/: placeholder for Power BI files (not used in this prototype).

Prerequisites
- Node.js 16+ and npm (or yarn).
- Recommended: PowerShell on Windows for the commands below (examples use PowerShell syntax).

Install dependencies
From the repository root (PowerShell):

```powershell
# Backend
cd backend; npm install; cd ..

# Frontend
cd frontend; npm install; cd ..
```

Run in development

1) Backend (default port: 5000)

```powershell
cd backend
# Start with live-reload if you installed nodemon
npm run dev

# Or run normally
npm start
```

2) Frontend (default port: 3000)

```powershell
cd frontend
npm start
```

The frontend expects the backend at http://localhost:5000 by default.

Build for production

```powershell
cd frontend
npm run build
```

API (summary)
The backend exposes several endpoints useful for development and testing. Key routes include:

- GET `/`  health/test route.

- Bottle Decision
  - POST `/api/bottles/evaluate`  Evaluate a bottle using per-customer rules. Body example:

```json
{
  "customerCode": "EK",
  "sealStatus": "Sealed",
  "fillLevel": 95,
  "labelStatus": "Good",
  "cleanliness": "Good"
}
```

  - GET `/api/bottles/history`  Returns in-memory history of decisions.

- Error Detection
  - GET `/api/error-detection/metrics`  Returns metrics for the error dashboard.
  - POST `/api/error-detection/sensor-reading`  Submit a sensor reading (JSON). Returns whether an alert was raised.
  - GET `/api/error-detection/alerts`  Recent alerts list.
  - POST `/api/error-detection/simulate`  Start a realtime simulation (development).

- Efficiency
  - GET `/api/efficiency/metrics`
  - GET `/api/efficiency/ranking`
  - POST `/api/efficiency/packing-record`
  - POST `/api/efficiency/simulate-record`

Notes: the prototype uses in-memory storage / mock data. No production DB is configured by default.

UI and styling
- The app uses a purple palette anchored at #667eea / #764ba2. Several components (BottleDecision, ErrorDashboard, EfficiencyDashboard) follow this palette. If you want a centralized theme, I can add CSS variables and refactor styles to use them.

Developer notes and troubleshooting
- If the frontend cannot reach the backend, confirm the backend is running on port 5000 and CORS is allowed.
- For faster iteration, run frontend and backend in separate terminals.
- The repo currently enforces ESLint rules; fix warnings related to hooks or types before merging to CI branches.

Future improvements (ideas)
- Add persistent storage for history and metrics (SQLite/Postgres).
- Add OpenAPI/Swagger documentation for the API.
- Replace lightweight SVG charts with a small charting library (Recharts/Chart.js) for interactivity.
- Add unit and integration tests for backend services and frontend components.

Contributing
- Fork, create a branch, and open a PR. Keep changes focused and include brief instructions to test them.

Contact / Help
- If you want me to: centralize the color palette, translate the README fully to English, or add example JSON bodies for every endpoint  tell me which and I will update the README.

---
Generated: improved README with setup, run and development notes. Feedback welcome.
