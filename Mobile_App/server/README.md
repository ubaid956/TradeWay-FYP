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

## 6. Marble Grading API

You can now request quality grades for any marble listing through the same backend:

- **Endpoint**: `POST /api/grading/marble`
- **Auth**: regular bearer token (seller, buyer, or admin).
- **Payload options**:
  - `productId` (required)
  - `imageUrls` (optional array). When omitted the service reuses the product's stored `images`.
  - `promptContext` (optional string) for any custom inspection notes.
  - Alternatively upload up to five files under the `images` field (multipart/form-data). Uploaded buffers are sent directly to Gemini.
- **AI configuration**: reuses `AI_API_KEY`, and you can override the default model with `AI_GRADING_MODEL`. Responses include the model metadata plus a normalized `grade`, `confidence`, `issues[]`, and `recommendations[]` payload that is persisted under `product.grading`.

Sample PowerShell call using existing product images:

```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{ productId = "<mongoId>"; promptContext = "Prioritize edge chipping" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/grading/marble" -Headers $headers -Body $body -ContentType "application/json"
```

Successful calls immediately return the stored `grading` document (status `completed`). If the AI rejects the request the server marks the product as `failed` with `grading.lastError` populated so sellers can retry once issues are resolved.

## 7. Troubleshooting

- **Port already in use**: ensure previous `npm start` processes are stopped (`Get-Process node`, `Stop-Process -Id <pid>`).
- **AI errors (404 or empty response)**: confirm the model name is supported by the API version. The service forces the v1 endpoint and defaults to `gemini-1.5-pro`, but you can override via `.env`.
- **No products returned**: rerun `node scripts/generateProducts.js` to repopulate the database.

With the above steps you can completely reset, seed, launch, and verify both the buyer/seller recommendation flow and the admin dashboard analytics. The admin React app simply consumes the routes listed above once `VITE_API_BASE_URL` points at this server.

## 8. Recommendation Validation Playbook

Use this checklist whenever you change the recommendation pipeline or want to prove the AI behavior end to end.

1. **Environment + data prep**

- Ensure `.env` contains `AI_API_KEY`, optional `AI_MODEL_NAME`, and `AI_API_VERSION` (defaults to `v1`).
- Run `node scripts/generateProducts.js` if the database was flushed; the recommender expects at least a handful of active marble products.
- Restart `npm start` so the model configuration is reloaded.

2. **Backend validation (PowerShell/Postman)**

- Register or log in a buyer, capture the JWT, and call:
  ```powershell
  $headers = @{ Authorization = "Bearer $token" }
  Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/recommendations?limit=5" -Headers $headers
  ```
- Expected response: `success:true`, `count<=5`, each entry has `productId`, `score`, `reason`, and an embedded `product` with `title`, `price`, `category`, `image`, `freshnessScore`.
- To test fallback behavior, temporarily comment `AI_API_KEY` (or block outbound internet) and restart the server. Requests should still return deterministic results with reasons such as “Popular marble listing…”. Restore the key afterward.
- Tail the server logs; you should see either `✅` model calls or `AI recommendation warning` lines when fallback is used.

3. **Frontend smoke test (React Native app)**

- Set `API_BASE_URL` (or equivalent env) inside `Mobile_App/frontend` to `http://localhost:5000`, then run `npm install` (once) and `npx expo start`.
- Log in with the same buyer account. Navigate to the Recommendations/Home tab; the feed should populate within a second and mirror the API response count.
- Pull-to-refresh: verify a network call to `/api/recommendations` fires (watch Metro logs or the in-app network inspector) and that empty states never appear thanks to the fallback.
- Optional stress test: change the buyer’s favorites by placing bids/orders, then refresh to confirm the AI starts surfacing the new categories.

Document the date, user, and observed response snippets whenever you run this playbook so future regressions can be compared quickly.
