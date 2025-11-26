# Quick Start Guide: Google Maps Integration

## Prerequisites
- Google Maps API Key: `AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs`
- Enable these APIs in Google Cloud Console:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Directions API
  - Distance Matrix API
  - Geocoding API

## Installation Steps

### 1. Frontend Setup (Already Done ✅)

The following packages are already installed in your project:
- `react-native-maps` - Google Maps for React Native
- `react-native-maps-directions` - Route directions
- `expo-location` - Location services

### 2. Backend Setup

Install axios if not already installed:
```bash
cd Mobile_App/server
npm install axios
```

### 3. Restart Servers

**Backend:**
```bash
cd Mobile_App/server
npm start
```

**Frontend:**
```bash
cd Mobile_App/Frontend
npx expo start -c
```

## Testing the Integration

### Test 1: View Tracking Page
1. Open the app
2. Navigate to Driver Dashboard → Tracking
3. Tap on a shipment
4. Should see Google Maps with route displayed

### Test 2: Start Location Tracking
1. From tracking details page
2. Tap "Start Tracking" button
3. Grant location permissions
4. Your location should appear on the map

### Test 3: Route Optimization
1. From tracking page, tap "Optimize Route"
2. Should see 3 route options:
   - Fastest Route (via highways)
   - Cheapest Route (no tolls)
   - Balanced Route
3. Select a route and tap "Start Navigation"

## File Locations

### New Files Created:
```
Frontend/
├── src/config/maps.ts                    ✅ Maps configuration
├── src/services/locationTrackingService.ts ✅ Location tracking
└── src/types/shipment.ts                 ✅ TypeScript types

Server/
├── models/
│   ├── Shipment.js                       ✅ Shipment model
│   └── DriverLocation.js                 ✅ Location tracking model
└── routes/
    ├── trackingRoutes.js                 ✅ Tracking API
    └── routeRoutes.js                    ✅ Route optimization API
```

### Modified Files:
```
Frontend/
└── app/Shipment/
    ├── TrackingDetail.tsx                ✅ Enhanced with maps
    └── RouteOptimization.tsx             ✅ Enhanced with routes

Server/
├── .env                                  ✅ Added API key
└── index.js                              ✅ Registered new routes
```

## API Endpoints

### Tracking
- `POST /api/tracking/location` - Update driver location
- `GET /api/tracking/location/:shipmentId` - Get current location
- `GET /api/tracking/shipment/:shipmentId` - Get shipment details
- `POST /api/tracking/status` - Update shipment status

### Routes
- `POST /api/routes/optimize` - Get optimized routes
- `POST /api/routes/distance` - Calculate distance
- `POST /api/routes/geocode` - Convert address to coordinates

## Permissions

The app will automatically request:
- **Location When In Use** - For tracking during app usage
- **Background Location** - For tracking when app is minimized

## Common Issues & Solutions

### Issue 1: Map Not Showing
**Solution:** 
- Ensure `react-native-maps` is properly installed
- Check that Google Services are configured in `google-services.json`

### Issue 2: Location Not Updating
**Solution:**
- Grant location permissions when prompted
- Ensure GPS is enabled on device
- Check that tracking is started (green indicator)

### Issue 3: Routes Not Loading
**Solution:**
- Verify API key is correct in `.env` and `maps.ts`
- Enable all required APIs in Google Cloud Console
- Check internet connection

### Issue 4: "Cannot find module" errors
**Solution:**
```bash
cd Mobile_App/Frontend
npx expo start -c
```

## Next Steps

1. **Test with Real Shipments:**
   - Create a shipment in the system
   - Assign it to a driver
   - Track it in real-time

2. **Customize Settings:**
   - Adjust update intervals in `locationTrackingService.ts`
   - Modify truck routing preferences in `maps.ts`

3. **Add More Features:**
   - Implement push notifications for status updates
   - Add geofencing for pickup/delivery zones
   - Integrate voice navigation

## Demo Data

The components include mock data for testing:
- Origin: Karachi (24.8607, 67.0011)
- Destination: Lahore (31.5204, 74.3587)
- Distance: ~1200 km
- Duration: ~4 hours

## Support

For detailed documentation, see: `GOOGLE_MAPS_INTEGRATION.md`

---

**Status:** ✅ Integration Complete
**Last Updated:** November 26, 2025
