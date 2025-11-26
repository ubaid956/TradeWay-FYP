# EAS Build Setup Checklist for Google Maps Integration

## ✅ SETUP STATUS - ALL READY FOR BUILD!

### 1. ✅ Package Dependencies (All Installed)
```json
✓ react-native-maps: ^1.13.1
✓ react-native-maps-directions: ^1.9.0
✓ expo-location: ~19.0.7
✓ axios: ^1.12.2
✓ expo-dev-client: ~6.0.18
```

### 2. ✅ Google Maps API Key Configuration

**API Key:** `AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs`

**Configured in:**
- ✅ `app.json` → `android.config.googleMaps.apiKey`
- ✅ `app.json` → `ios.config.googleMapsApiKey`
- ✅ `app.json` → `extra.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- ✅ `.env` → `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- ✅ `server/.env` → `GOOGLE_MAPS_API_KEY`
- ✅ `src/config/maps.ts` → Hardcoded as fallback

### 3. ✅ Android Permissions (All Set)
```json
✓ android.permission.INTERNET
✓ android.permission.ACCESS_FINE_LOCATION
✓ android.permission.ACCESS_COARSE_LOCATION
✓ android.permission.ACCESS_BACKGROUND_LOCATION
✓ android.permission.FOREGROUND_SERVICE
✓ android.permission.WAKE_LOCK
✓ android.permission.VIBRATE
✓ android.permission.POST_NOTIFICATIONS
```

### 4. ✅ iOS Permissions (All Set)
```json
✓ NSLocationWhenInUseUsageDescription
✓ NSLocationAlwaysAndWhenInUseUsageDescription
✓ NSLocationAlwaysUsageDescription
✓ NSCameraUsageDescription
✓ NSMicrophoneUsageDescription
✓ NSPhotoLibraryUsageDescription
```

### 5. ✅ Expo Plugins (All Configured)
```json
✓ expo-location (with background tracking)
✓ expo-build-properties (Android/iOS settings)
✓ @react-native-firebase/app
✓ @react-native-google-signin/google-signin
✓ @stripe/stripe-react-native
✓ expo-notifications
```

### 6. ✅ Build Configuration
```json
eas.json:
✓ development profile: developmentClient: true
✓ android buildType: apk
✓ distribution: internal
```

### 7. ✅ Google Cloud Console - Required APIs

**IMPORTANT: Enable these APIs in Google Cloud Console:**

1. **Maps SDK for Android** ⚠️ MUST ENABLE
2. **Maps SDK for iOS** ⚠️ MUST ENABLE  
3. **Directions API** ⚠️ MUST ENABLE
4. **Distance Matrix API** ⚠️ MUST ENABLE
5. **Geocoding API** ⚠️ MUST ENABLE

**How to Enable:**
1. Go to: https://console.cloud.google.com/
2. Select your project
3. Navigate to: APIs & Services → Library
4. Search for each API above and click "Enable"

### 8. ✅ Android Build Configuration
```json
✓ compileSdkVersion: 35
✓ targetSdkVersion: 35
✓ minSdkVersion: 24
✓ buildToolsVersion: 34.0.0
✓ usesCleartextTraffic: true (for local dev)
✓ kotlinVersion: 1.8.22
```

### 9. ✅ Files Created/Modified

**Frontend (New Files):**
- ✅ `src/config/maps.ts` - Maps configuration
- ✅ `src/services/locationTrackingService.ts` - Location tracking
- ✅ `src/types/shipment.ts` - TypeScript types
- ✅ `.env` - Environment variables

**Frontend (Modified):**
- ✅ `app/Shipment/TrackingDetail.tsx` - Real-time tracking UI
- ✅ `app/Shipment/RouteOptimization.tsx` - Route options UI
- ✅ `app.json` - Added plugins & permissions
- ✅ `package.json` - Dependencies installed

**Backend (New Files):**
- ✅ `models/Shipment.js` - Shipment model
- ✅ `models/DriverLocation.js` - Location model
- ✅ `routes/trackingRoutes.js` - Tracking API
- ✅ `routes/routeRoutes.js` - Route optimization API

**Backend (Modified):**
- ✅ `index.js` - Routes registered
- ✅ `.env` - API key added

---

## 🚀 BUILD COMMANDS

### Option 1: EAS Build (Recommended)
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/Frontend

# Login to Expo (if not already)
npx eas-cli login

# Build for Android (Development)
npx eas-cli build --platform android --profile development

# After build completes, download and install the APK on your device
```

### Option 2: Local Build
```bash
cd /home/ubaid/Data/FYP/FYP_II_100%/Code/Mobile_App/Frontend

# Prebuild native code
npx expo prebuild --clean

# Run on connected Android device
npx expo run:android
```

---

## 📱 TESTING CHECKLIST

After installing the development build:

### Test 1: Location Permissions
- [ ] Open app and navigate to Driver → Tracking
- [ ] App should request location permission
- [ ] Grant "Allow all the time" for background tracking

### Test 2: Map Display
- [ ] Tap on a shipment
- [ ] Google Maps should display with route
- [ ] Should see origin (green), destination (red) markers

### Test 3: Location Tracking
- [ ] Tap "Start Tracking" button
- [ ] Blue car icon should appear at your location
- [ ] Location should update every 5 seconds

### Test 4: Route Optimization
- [ ] Tap "Optimize Route" from tracking screen
- [ ] Should see 3 route options:
  - ⚡ Fastest Route
  - 💰 Cheapest Route
  - ⚖️ Balanced Route
- [ ] Each route shows distance, time, cost

### Test 5: Backend APIs
- [ ] Location updates should be sent to backend
- [ ] Check MongoDB for location records
- [ ] Route optimization should call Google Maps API

---

## ⚠️ TROUBLESHOOTING

### Issue 1: Map not showing
**Solution:**
- Ensure Google Maps APIs are enabled in Cloud Console
- Check API key is correct in app.json
- Verify internet connection

### Issue 2: "RNMapsAirModule not found"
**Solution:**
- This means you need to build with EAS or prebuild
- Expo Go doesn't support react-native-maps
- Run: `npx eas-cli build --platform android --profile development`

### Issue 3: Location permission denied
**Solution:**
- Android: Go to Settings → Apps → TradeWay → Permissions → Location → Allow all the time
- Request permission again in app

### Issue 4: Routes not calculating
**Solution:**
- Check backend server is running
- Verify GOOGLE_MAPS_API_KEY in server/.env
- Check console for API errors
- Verify Directions API is enabled

### Issue 5: Build fails
**Solution:**
- Run: `npx expo install --check` to fix version mismatches
- Clear cache: `npx expo start -c`
- Check google-services.json is present

---

## 📊 FEATURES IMPLEMENTED

### ✅ FE-1: Real-Time Shipment Tracking
- Live GPS tracking (5-second intervals)
- Interactive Google Maps
- Progress bar with delivery percentage
- Real-time driver location marker
- Speed, heading, ETA display
- Status history and updates

### ✅ FE-2: Route Optimization
- AI-powered route scoring (0-100)
- Multiple route alternatives
- Cost, time, distance comparison
- Savings calculations
- Traffic-aware routing

### ✅ FE-3: Truck-Specific Navigation
- Toll avoidance option
- Highway preference settings
- Truck-friendly route identification
- Route warnings (traffic, roads)
- Weight/size restrictions considered

### ✅ FE-4: Google Maps API Integration
- Full Maps SDK integration
- Directions API for routes
- Distance Matrix API
- Geocoding for addresses
- Real-time traffic overlay
- Custom markers and polylines

---

## 🔐 API KEY SECURITY

**Current Setup (Development):**
- API key is embedded in app.json
- API key is in .env files

**For Production:**
1. **Use API Key Restrictions:**
   - Go to Google Cloud Console
   - Restrict key to Android/iOS apps
   - Add your package name: `com.tradeway.fyp`
   - Add SHA-1 fingerprint

2. **Backend Proxy (Recommended):**
   - Keep Google Maps API key only on backend
   - Frontend calls your backend
   - Backend calls Google Maps API

---

## 💰 COST ESTIMATION

**Google Maps API Pricing:**
- Maps SDK: $7/1,000 loads
- Directions API: $5/1,000 requests
- Distance Matrix: $5/1,000 elements
- Geocoding: $5/1,000 requests

**Free Tier:** $200/month credit

**Expected Usage (100 drivers):**
- ~60,000 map loads/month = $420
- ~2,000 route calculations = $10
- Monthly total: ~$230 (after free credit)

---

## 📞 SUPPORT

If you encounter issues during build:

1. Check EAS build logs for errors
2. Verify all APIs are enabled in Google Cloud Console
3. Ensure google-services.json is present
4. Check package versions match Expo SDK 54

---

## ✅ FINAL CHECKLIST BEFORE BUILD

- [x] All packages installed
- [x] Google Maps API key configured in all places
- [x] Permissions added to app.json
- [x] expo-location plugin configured
- [x] Android/iOS build settings configured
- [x] Backend routes implemented
- [x] Database models created
- [x] .env files configured

**🎉 YOU ARE READY TO BUILD! 🎉**

Run: `npx eas-cli build --platform android --profile development`
