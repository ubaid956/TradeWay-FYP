# Mobile App Backend Runbook

## 1. Prerequisites

- Node.js 18+ (project tested with Node 22.14)
- MongoDB Atlas URI (configure `MONGODB_URI` in `.env`)
- Firebase Admin JSON file referenced in `index.js`
- Mail credentials (`USER`, `APP_PASSWORD`) and Cloudinary keys
- AI provider key in `.env` (`AI_API_KEY` and optional `AI_MODEL_NAME`)
- Admin dashboard credentials in `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, optional `ADMIN_NAME`, `ADMIN_PHONE`)

Install dependencies once:

```powershell
Set-Location d:\FYP\App\Mobile_App\server
npm install
```

## 2. Seed Sample Data

Generate vendors/buyers plus marble listings and snapshots:

```powershell
node .\scripts\generateProducts.js
```

Outputs:

- Inserts products tagged `sample-dataset` into MongoDB
- Writes `data/sampleProducts.json` and `data/sampleProducts.csv`

Set `SAMPLE_PRODUCT_COUNT` in `.env` to change the volume before running the script.

## 3. Run the API Locally

```powershell
npm start
```

This launches `nodemon` on port defined by `PORT` (default 5000). Stop with `Ctrl+C`.

Common warning: Mongoose reports a duplicate index for `orderNumber`; it is safe but can be cleaned up later.

## 4. Core Smoke Tests

Use PowerShell or Postman. Example sequence:

```powershell
# Register buyer and capture token
$body = @{ name="Demo Buyer"; email="demo.buyer@example.com"; phone="03001234567"; password="Password123!"; role="buyer" } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/register" -Body $body -ContentType "application/json"
$token = $response.token

# List products
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/products?limit=5"

# Recommendations (requires Authorization header)
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/recommendations?limit=5" -Headers $headers
```

The recommendation service first calls the external AI model (via `AI_API_KEY`) and now falls back to deterministic trending products if the model returns nothing, guaranteeing non-empty responses during development.

## 5. Admin Dashboard API

The React-based admin dashboard (found under `admin/client/tradeway-admin`) now talks directly to this backend. To enable it:

1. **Configure credentials**: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (and optional `ADMIN_NAME`, `ADMIN_PHONE`) in `.env`. The backend uses these values for verification and auto-creates/updates the matching admin `User` record on login. The public `/api/auth/register` endpoint refuses the `admin` role, so this is the only way to provision that account.

2. **Login endpoint**: the dashboard uses `POST /api/admin/auth/login` (email + password) and receives a JWT which must accompany all admin requests in the `Authorization: Bearer <token>` header.

3. **Protected analytics routes** (all require the admin token):

   - `GET /api/admin/overview/cards` — summary KPIs (orders, delivery %, GMV, ASP)
   - `GET /api/admin/overview/charts?gran=month|week` — GMV / orders / ASP series
   - `GET /api/admin/price-index?category=Carrara&from=YYYY-MM-DD&to=YYYY-MM-DD` — pricing + volume per month
   - `GET /api/admin/forecast?target=price|demand&category=Carrara&h=6` — linear projections used by the Forecasts page
   - `GET /api/admin/sellers/table?sort=-gmv&limit=20&offset=0` — seller leaderboard
   - `GET|POST /api/industry/updates` — fetch or publish industry insight cards (POST remains admin-only)

4. **Point the dashboard at this API**: set `VITE_API_BASE_URL=http://localhost:5000` (or your deployed URL) before running `npm run dev` inside `admin/client/tradeway-admin`.

## 6. Troubleshooting

- **Port already in use**: ensure previous `npm start` processes are stopped (`Get-Process node`, `Stop-Process -Id <pid>`).
- **AI errors (404 or empty response)**: confirm the model name is supported by the API version. The service forces the v1 endpoint and defaults to `gemini-1.5-pro`, but you can override via `.env`.
- **No products returned**: rerun `node scripts/generateProducts.js` to repopulate the database.

With the above steps you can completely reset, seed, launch, and verify both the buyer/seller recommendation flow and the admin dashboard analytics. The admin React app simply consumes the routes listed above once `VITE_API_BASE_URL` points at this server.
