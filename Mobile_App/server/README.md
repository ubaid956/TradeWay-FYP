# Mobile App Backend Runbook

## 1. Prerequisites

- Node.js 18+ (project tested with Node 22.14)
- MongoDB Atlas URI (configure `MONGODB_URI` in `.env`)
- Firebase Admin JSON file referenced in `index.js`
- Mail credentials (`USER`, `APP_PASSWORD`) and Cloudinary keys
- AI provider key in `.env` (`AI_API_KEY` and optional `AI_MODEL_NAME`)

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

## 5. Troubleshooting

- **Port already in use**: ensure previous `npm start` processes are stopped (`Get-Process node`, `Stop-Process -Id <pid>`).
- **AI errors (404 or empty response)**: confirm the model name is supported by the API version. The service forces the v1 endpoint and defaults to `gemini-1.5-pro`, but you can override via `.env`.
- **No products returned**: rerun `node scripts/generateProducts.js` to repopulate the database.

With the above steps you can completely reset, seed, launch, and verify the backend recommendation flow. Frontend integration can now rely on `GET /api/recommendations` returning at least `count = limit` items.
