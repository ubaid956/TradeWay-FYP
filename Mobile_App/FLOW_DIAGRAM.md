# Complete Job-to-Shipment Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DRIVER MOBILE APP                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │     Jobs     │    │ Assignments  │    │   Tracking   │          │
│  │    Screen    │───▶│    Screen    │───▶│    Screen    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                    │                    │                  │
│         │ Accept Job         │ Track Shipment     │ Track Live      │
│         ▼                    ▼                    ▼                  │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              TrackingDetail (Google Maps)             │          │
│  │  • Origin/Destination Markers                         │          │
│  │  • Driver Location (Real-time)                        │          │
│  │  • Route Polyline                                     │          │
│  │  • Progress Bar                                       │          │
│  └──────────────────────────────────────────────────────┘          │
│                           │                                          │
│                           │ GPS Updates (5s interval)                │
│                           ▼                                          │
└───────────────────────────────────────────────────────────────────┬─┘
                            │                                         │
                            │                                         │
                            ▼                                         │
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API SERVER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────┐         ┌─────────────────────┐            │
│  │   Job Controller    │◀───────▶│ Shipment Controller │            │
│  ├─────────────────────┤         ├─────────────────────┤            │
│  │ • assignJob()       │         │ • updateLocation()  │            │
│  │   → Create Shipment │         │ • getShipment()     │            │
│  │ • updateJobStatus() │         │ • updateStatus()    │            │
│  │   → Sync Shipment   │         └─────────────────────┘            │
│  │ • getDriverJobs()   │                    │                        │
│  │   → Populate Ship.  │                    │                        │
│  └─────────────────────┘                    │                        │
│            │                                 │                        │
│            ▼                                 ▼                        │
│  ┌─────────────────────┐         ┌─────────────────────┐            │
│  │     Job Model       │         │   Shipment Model    │            │
│  ├─────────────────────┤         ├─────────────────────┤            │
│  │ _id                 │         │ _id                 │            │
│  │ driver              │         │ driverId            │            │
│  │ product             │         │ orderId             │            │
│  │ status              │◀───────▶│ status              │            │
│  │ origin (lat/lon)    │         │ origin (GeoJSON)    │            │
│  │ destination         │         │ destination         │            │
│  │ shipment ───────────┼────────▶│ currentLocation     │            │
│  │ cargoDetails        │         │ distance            │            │
│  └─────────────────────┘         │ estimatedDelivery   │            │
│                                   │ items[]             │            │
│                                   └─────────────────────┘            │
│                                              │                        │
│                                   2dsphere indexes                   │
│                                              │                        │
└──────────────────────────────────────────────┼─────────────────────┬─┘
                                               │                      │
                                               ▼                      │
                                    ┌────────────────────┐            │
                                    │  MongoDB Database  │            │
                                    │  • jobs collection │            │
                                    │  • shipments       │            │
                                    │  • driverlocations │            │
                                    └────────────────────┘            │
                                                                      │
┌─────────────────────────────────────────────────────────────────────┘
│
│  ┌──────────────────────────────────────────────────────────┐
│  │               Google Maps Platform                        │
│  ├──────────────────────────────────────────────────────────┤
│  │  • Maps SDK (Android/iOS) - Display maps                 │
│  │  • Directions API - Route polylines                      │
│  │  • Distance Matrix API - Distance calculations           │
│  │  • Geocoding API - Address to coordinates                │
│  └──────────────────────────────────────────────────────────┘
│
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### 1. Job Acceptance Flow

```
┌────────┐                ┌────────┐              ┌──────────┐
│ Driver │                │   API  │              │ Database │
└───┬────┘                └───┬────┘              └────┬─────┘
    │                         │                        │
    │ 1. Tap "Accept Job"     │                        │
    ├────────────────────────▶│                        │
    │ POST /jobs/:id/assign   │                        │
    │                         │                        │
    │                         │ 2. Find Job            │
    │                         ├───────────────────────▶│
    │                         │                        │
    │                         │ 3. Populate Product    │
    │                         │    Vendor, Buyer       │
    │                         │◀───────────────────────┤
    │                         │                        │
    │                         │ 4. Create Shipment     │
    │                         │    - Convert to GeoJSON│
    │                         │    - Set ETA (+4h)     │
    │                         │    - Create items[]    │
    │                         ├───────────────────────▶│
    │                         │                        │
    │                         │ 5. Update Job          │
    │                         │    job.driver = driverId
    │                         │    job.shipment = shipId
    │                         │    job.status = 'assigned'
    │                         ├───────────────────────▶│
    │                         │                        │
    │ 6. Return job + shipment│                        │
    │◀────────────────────────┤                        │
    │                         │                        │
```

### 2. View Assignments Flow

```
┌────────┐                ┌────────┐              ┌──────────┐
│ Driver │                │   API  │              │ Database │
└───┬────┘                └───┬────┘              └────┬─────┘
    │                         │                        │
    │ 1. Open Assignments     │                        │
    ├────────────────────────▶│                        │
    │ GET /jobs/driver        │                        │
    │ ?includeAssigned=true   │                        │
    │                         │                        │
    │                         │ 2. Find driver jobs    │
    │                         │    + populate shipment │
    │                         ├───────────────────────▶│
    │                         │                        │
    │                         │ 3. Filter assigned/    │
    │                         │    in_transit jobs     │
    │                         │◀───────────────────────┤
    │                         │                        │
    │ 4. Display jobs with    │                        │
    │    shipment info        │                        │
    │◀────────────────────────┤                        │
    │ - Status badge          │                        │
    │ - ETA, distance         │                        │
    │ - Track button          │                        │
    │                         │                        │
```

### 3. Live Tracking Flow

```
┌────────┐       ┌────────┐       ┌──────────┐       ┌────────────┐
│ Driver │       │TrackingDetail   │   API    │       │   Google   │
└───┬────┘       └───┬────┘       └────┬─────┘       └─────┬──────┘
    │                │                  │                    │
    │ 1. Tap "Track  │                  │                    │
    │    Shipment"   │                  │                    │
    ├───────────────▶│                  │                    │
    │                │                  │                    │
    │                │ 2. Fetch shipment│                    │
    │                ├─────────────────▶│                    │
    │                │                  │                    │
    │                │ 3. Get route     │                    │
    │                ├──────────────────┼───────────────────▶│
    │                │                  │  Directions API    │
    │                │◀─────────────────┼────────────────────┤
    │                │  Polyline        │                    │
    │                │                  │                    │
    │ 4. Display map │                  │                    │
    │    - Origin    │                  │                    │
    │    - Destination                  │                    │
    │    - Route     │                  │                    │
    │◀───────────────┤                  │                    │
    │                │                  │                    │
    │ 5. Tap "Start  │                  │                    │
    │    Tracking"   │                  │                    │
    ├───────────────▶│                  │                    │
    │                │                  │                    │
    │                │ 6. Get GPS (loop)│                    │
    │                │    every 5s      │                    │
    │                │                  │                    │
    │                │ 7. Send location │                    │
    │                ├─────────────────▶│                    │
    │                │ POST /tracking/  │                    │
    │                │      location    │                    │
    │                │                  │                    │
    │                │ 8. Update marker │                    │
    │                │    & progress    │                    │
    │◀───────────────┤                  │                    │
    │                │                  │                    │
```

### 4. Status Sync Flow

```
┌────────┐         ┌────────┐         ┌──────────┐
│ Driver │         │   API  │         │ Database │
└───┬────┘         └───┬────┘         └────┬─────┘
    │                  │                   │
    │ 1. Update status │                   │
    ├─────────────────▶│                   │
    │ POST /jobs/:id/  │                   │
    │      status      │                   │
    │ { status:        │                   │
    │   'in_transit' } │                   │
    │                  │                   │
    │                  │ 2. Update Job     │
    │                  ├──────────────────▶│
    │                  │ job.status =      │
    │                  │   'in_transit'    │
    │                  │                   │
    │                  │ 3. Map status     │
    │                  │ assigned→picked_up│
    │                  │ in_transit→       │
    │                  │   in_transit      │
    │                  │                   │
    │                  │ 4. Update Shipment│
    │                  ├──────────────────▶│
    │                  │ shipment.status = │
    │                  │   'in_transit'    │
    │                  │ + statusHistory   │
    │                  │                   │
    │ 5. Success       │                   │
    │◀─────────────────┤                   │
    │                  │                   │
```

## Status Mappings

```
┌───────────────────────────────────────────────────────────┐
│                    Status Flow Chart                       │
├───────────────────────────────────────────────────────────┤
│                                                            │
│   Job Status              Shipment Status                 │
│   ═══════════             ════════════════                │
│                                                            │
│   [pending]       ─────▶  [pending]                       │
│       │                      │                            │
│       │ Driver accepts       │                            │
│       ▼                      ▼                            │
│   [assigned]      ─────▶  [picked_up]                     │
│       │                      │                            │
│       │ Start delivery       │                            │
│       ▼                      ▼                            │
│   [in_transit]    ─────▶  [in_transit]                    │
│       │                      │                            │
│       │ Complete             │                            │
│       ▼                      ▼                            │
│   [delivered]     ─────▶  [delivered]                     │
│                              │                            │
│                              │ actualDeliveryTime set     │
│                              ▼                            │
│                          Order → 'Completed'              │
│                                                            │
│   [cancelled]     ─────▶  [cancelled]                     │
│                              │                            │
│                              ▼                            │
│                          Order → 'Canceled'               │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

## GeoJSON Conversion

```
┌─────────────────────────────────────────────────────────┐
│              Job Location → Shipment GeoJSON            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Job Model (Standard Format)                            │
│  ──────────────────────────                             │
│  {                                                       │
│    origin: {                                             │
│      latitude: 24.8607,    ◀── User-friendly format     │
│      longitude: 67.0011,                                 │
│      address: "Karachi Port",                            │
│      city: "Karachi"                                     │
│    }                                                     │
│  }                                                       │
│                                                          │
│           │                                              │
│           │ assignJob() converts                         │
│           ▼                                              │
│                                                          │
│  Shipment Model (GeoJSON Format)                        │
│  ────────────────────────────────                       │
│  {                                                       │
│    origin: {                                             │
│      location: {                                         │
│        type: 'Point',      ◀── MongoDB 2dsphere required│
│        coordinates: [                                    │
│          67.0011,          ◀── longitude FIRST          │
│          24.8607           ◀── latitude SECOND          │
│        ]                                                 │
│      },                                                  │
│      address: "Karachi Port",                            │
│      city: "Karachi"                                     │
│    }                                                     │
│  }                                                       │
│                                                          │
│  Why? MongoDB geospatial queries require GeoJSON        │
│  $near, $geoWithin work with [longitude, latitude]      │
│  Google Maps also uses [lon, lat] for coordinates       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Component Communication

```
┌──────────────────────────────────────────────────────────┐
│                   Frontend Navigation                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Jobs Screen                                              │
│  ─────────────────                                        │
│  [Accept Job] ─▶ assignJob(jobId) ─▶ Backend             │
│                                                           │
│                                                           │
│  Assignments Screen                                       │
│  ───────────────────────                                 │
│  fetchAssignments()                                       │
│    ↓                                                      │
│  GET /api/jobs/driver?includeAssigned=true               │
│    ↓                                                      │
│  Filter jobs with shipment                                │
│    ↓                                                      │
│  [Track Shipment] ──▶ TrackingDetail                     │
│       params: { shipmentId }                              │
│                                                           │
│                                                           │
│  Tracking Screen                                          │
│  ─────────────────                                       │
│  fetchActiveShipments()                                   │
│    ↓                                                      │
│  GET /api/jobs/driver?includeAssigned=true               │
│    ↓                                                      │
│  Extract shipments from jobs                              │
│    ↓                                                      │
│  [Track Live] ──▶ TrackingDetail                         │
│       params: { shipmentId }                              │
│    │                                                      │
│    └─ [Optimize Route] ──▶ RouteOptimization             │
│           params: { origin, destination }                 │
│                                                           │
│                                                           │
│  TrackingDetail Screen                                    │
│  ───────────────────────                                 │
│  • MapView (react-native-maps)                           │
│  • Origin Marker (green)                                  │
│  • Destination Marker (red)                               │
│  • Driver Marker (blue, updates every 5s)                │
│  • MapViewDirections (polyline)                          │
│  • Progress calculation                                   │
│  • [Start Tracking] ─▶ LocationTrackingService           │
│                             ↓                             │
│                      GPS updates (5s loop)                │
│                             ↓                             │
│                      POST /api/tracking/location          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Key Integrations

```
┌─────────────────────────────────────────────────────────┐
│                  System Dependencies                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend                                                │
│  ────────                                               │
│  • expo-location (GPS tracking)                         │
│  • react-native-maps (MapView)                          │
│  • react-native-maps-directions (Polylines)             │
│  • axios (API calls)                                     │
│  • @react-native-async-storage (token storage)          │
│                                                          │
│  Backend                                                 │
│  ───────                                                │
│  • mongoose (MongoDB with 2dsphere)                     │
│  • express (REST API)                                    │
│  • jsonwebtoken (auth)                                   │
│  • axios (Google Maps API calls)                         │
│                                                          │
│  External Services                                       │
│  ─────────────────                                      │
│  • Google Maps Platform                                  │
│    - API Key: AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs  │
│    - Maps SDK (Android/iOS)                              │
│    - Directions API                                      │
│    - Distance Matrix API                                 │
│    - Geocoding API                                       │
│                                                          │
│  • MongoDB                                               │
│    - Geospatial indexes (2dsphere)                      │
│    - TTL index (DriverLocation 30 days)                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Legend

```
─────▶  Data/Control Flow
◀─────  Response/Return Flow
├─────  Tree Branch
│       Vertical Connection
└─────  Tree End
═════   Status/State
[  ]    Button/Action
{  }    Data Object
```
