# Google Maps Integration for Driver Tracking & Route Optimization

## Overview
This document describes the Google Maps API integration for the TradeWay driver dashboard, implementing real-time shipment tracking and AI-powered route optimization with truck-specific navigation.

## Features Implemented

### 1. Real-Time Shipment Tracking (FE-1)
- **Live GPS tracking** of driver location
- **Interactive map** showing origin, destination, and current position
- **Real-time status updates** with progress bar
- **Speed and heading** information
- **Automatic location updates** every 5 seconds
- **Background tracking** support

### 2. Route Optimization (FE-2)
- **Multiple route suggestions** (Fastest, Cheapest, Balanced)
- **AI scoring system** (0-100) for route quality
- **Cost estimates** for each route
- **Time and distance** comparisons
- **Savings calculations** across routes

### 3. Truck-Specific Navigation (FE-3)
- **Avoid tolls** option
- **Truck-friendly routes** identification
- **Traffic information** display
- **Route warnings** for heavy traffic areas
- **Rest stops and fuel stations** waypoints

### 4. Google Maps API Integration (FE-4)
- **Google Maps SDK** for React Native
- **Directions API** for route calculation
- **Distance Matrix API** for distance calculation
- **Geocoding API** for address conversion
- **Real-time traffic** overlay

---

## File Structure

```
Mobile_App/
├── Frontend/
│   ├── app/
│   │   ├── Driver/
│   │   │   ├── Tracking.tsx              # Driver tracking list
│   │   │   └── Assignments.tsx            # Driver assignments
│   │   └── Shipment/
│   │       ├── TrackingDetail.tsx         # ✨ Enhanced with Google Maps
│   │       └── RouteOptimization.tsx      # ✨ Enhanced with route options
│   └── src/
│       ├── config/
│       │   ├── api.ts
│       │   └── maps.ts                    # ✨ NEW: Google Maps config
│       ├── services/
│       │   └── locationTrackingService.ts # ✨ NEW: Location tracking
│       └── types/
│           └── shipment.ts                # ✨ NEW: TypeScript types
└── server/
    ├── .env                               # ✨ Updated with API key
    ├── models/
    │   ├── Shipment.js                    # ✨ NEW: Shipment model
    │   └── DriverLocation.js              # ✨ NEW: Location model
    └── routes/
        ├── trackingRoutes.js              # ✨ NEW: Tracking endpoints
        └── routeRoutes.js                 # ✨ NEW: Route optimization
```

---

## Configuration

### Google Maps API Key
```
API Key: AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs
```

**Required APIs (Enable in Google Cloud Console):**
1. Maps SDK for Android
2. Maps SDK for iOS
3. Directions API
4. Distance Matrix API
5. Geocoding API

### Environment Variables

**Frontend:** `Frontend/src/config/maps.ts`
```typescript
export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs',
  // ... other config
};
```

**Backend:** `server/.env`
```env
GOOGLE_MAPS_API_KEY=AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs
```

---

## API Endpoints

### Tracking Endpoints

#### 1. Update Driver Location
```http
POST /api/tracking/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipmentId": "64abc123...",
  "location": {
    "latitude": 24.8607,
    "longitude": 67.0011
  },
  "speed": 65,
  "heading": 180,
  "accuracy": 10
}
```

#### 2. Get Current Location
```http
GET /api/tracking/location/:shipmentId
Authorization: Bearer <token>
```

#### 3. Get Location History
```http
GET /api/tracking/history/:shipmentId?limit=100
Authorization: Bearer <token>
```

#### 4. Get Shipment Details
```http
GET /api/tracking/shipment/:shipmentId
Authorization: Bearer <token>
```

#### 5. Update Shipment Status
```http
POST /api/tracking/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipmentId": "64abc123...",
  "status": "in_transit",
  "message": "Departed from warehouse"
}
```

### Route Optimization Endpoints

#### 1. Optimize Routes
```http
POST /api/routes/optimize
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin": {
    "latitude": 24.8607,
    "longitude": 67.0011
  },
  "destination": {
    "latitude": 31.5204,
    "longitude": 74.3587
  },
  "vehicleType": "truck",
  "avoidTolls": true
}
```

#### 2. Calculate Distance
```http
POST /api/routes/distance
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin": { "latitude": 24.8607, "longitude": 67.0011 },
  "destination": { "latitude": 31.5204, "longitude": 74.3587 }
}
```

#### 3. Geocode Address
```http
POST /api/routes/geocode
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "Karachi Port, Pakistan"
}
```

---

## Usage Guide

### For Drivers

#### Starting Tracking
1. Navigate to **Driver Dashboard** → **Tracking**
2. Select an active shipment
3. Tap **"Start Tracking"** button
4. Grant location permissions when prompted
5. App will automatically update location every 5 seconds

#### Viewing Route Options
1. From shipment details, tap **"Optimize Route"**
2. View multiple route options with:
   - Duration and distance
   - Estimated cost
   - Toll information
   - Traffic status
3. Select preferred route
4. Tap **"Start Navigation"** to begin

#### Map Controls
- **Locate Button**: Centers map on current driver position
- **Resize Button**: Fits entire route on screen
- **Zoom**: Pinch to zoom in/out
- **Traffic**: Toggle traffic overlay

### For Buyers/Vendors

#### Tracking Shipments
1. Navigate to **Orders** → Select order
2. View **Tracking Details**
3. See real-time driver location on map
4. Check delivery progress bar
5. View ETA and current status

---

## TypeScript Types

### Shipment
```typescript
interface Shipment {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  origin: {
    address: string;
    location: Location;
    name?: string;
  };
  destination: {
    address: string;
    location: Location;
    name?: string;
  };
  estimatedDeliveryTime: Date;
  currentStatus: ShipmentStatus;
  distance?: number;
}
```

### OptimizedRoute
```typescript
interface OptimizedRoute {
  id: string;
  name: string;
  distance: number; // km
  duration: number; // seconds
  estimatedCost: number; // PKR
  waypoints: RouteWaypoint[];
  avoidsTolls: boolean;
  truckFriendly: boolean;
  recommendation: 'fastest' | 'shortest' | 'cheapest' | 'balanced';
  aiScore: number; // 0-100
  traffic?: 'low' | 'medium' | 'high';
}
```

---

## Database Models

### Shipment Model
```javascript
{
  orderId: ObjectId,
  driverId: ObjectId,
  vehicleNumber: String,
  origin: {
    address: String,
    location: { type: Point, coordinates: [lon, lat] }
  },
  destination: { ... },
  currentLocation: { type: Point, coordinates: [lon, lat] },
  status: Enum['pending', 'picked_up', 'in_transit', 'delivered'],
  statusHistory: [{ status, message, timestamp }],
  distance: Number
}
```

### DriverLocation Model
```javascript
{
  driverId: ObjectId,
  shipmentId: ObjectId,
  location: { type: Point, coordinates: [lon, lat] },
  speed: Number,
  heading: Number,
  accuracy: Number,
  timestamp: Date
}
```

---

## Location Tracking Service

### Methods

#### `requestPermissions()`
Request location permissions from user

#### `getCurrentLocation()`
Get current GPS location once

#### `startTracking(shipmentId)`
Start continuous location tracking for a shipment

#### `stopTracking()`
Stop location tracking

#### `calculateDistance(lat1, lon1, lat2, lon2)`
Calculate distance between two points using Haversine formula

---

## Permissions Required

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track shipments</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need background location to track shipments while app is in background</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

---

## Testing

### Test Locations (Pakistan)
```typescript
const TEST_LOCATIONS = {
  karachi: { latitude: 24.8607, longitude: 67.0011 },
  lahore: { latitude: 31.5204, longitude: 74.3587 },
  islamabad: { latitude: 33.6844, longitude: 73.0479 },
  multan: { latitude: 30.1575, longitude: 71.5249 }
};
```

### Mock Data
Both components include mock data for testing when backend is unavailable.

---

## Performance Considerations

1. **Location Updates**: Set to 5 seconds interval (configurable)
2. **Battery Optimization**: Use background location sparingly
3. **Data Usage**: Location updates are ~1KB each
4. **Offline Support**: Locations stored locally when offline
5. **Map Caching**: Maps are cached by react-native-maps

---

## Troubleshooting

### Location Not Updating
1. Check location permissions are granted
2. Ensure GPS is enabled on device
3. Verify tracking is started (green indicator)
4. Check console for error messages

### Routes Not Loading
1. Verify Google Maps API key is correct
2. Check all required APIs are enabled in Google Cloud Console
3. Verify API key has no restrictions blocking your app
4. Check network connectivity

### Map Not Displaying
1. Ensure `react-native-maps` is properly linked
2. Check Google Services JSON file is in place (Android)
3. Verify API key in app.json (iOS)

---

## Future Enhancements

1. **Voice Navigation**: Turn-by-turn voice guidance
2. **Offline Maps**: Download maps for offline use
3. **Geofencing**: Alerts when driver enters/exits zones
4. **Driver Analytics**: Track driver performance metrics
5. **Multi-stop Routes**: Support for multiple delivery points
6. **Weather Integration**: Show weather conditions along route
7. **Real-time Notifications**: Push notifications for status changes

---

## Cost Estimation (Google Maps API)

### Pricing (as of 2024)
- **Maps SDK**: $7.00 per 1,000 loads
- **Directions API**: $5.00 per 1,000 requests
- **Distance Matrix**: $5.00 per 1,000 elements
- **Geocoding**: $5.00 per 1,000 requests

**Monthly Free Tier**: $200 credit (~28,000 map loads)

### Estimated Monthly Cost (100 active drivers)
- Map loads: 100 drivers × 20 shipments × 30 days = 60,000 loads = ~$420
- Route calculations: 2,000 requests = $10
- Location updates: Free (using own backend)

**Total**: ~$430/month (reduced by $200 free credit = $230/month)

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review API quotas in Google Cloud Console
- Verify all permissions are granted
- Test with mock data first

---

## License

This integration is part of the TradeWay platform.
Google Maps API usage subject to Google Maps Platform Terms of Service.
