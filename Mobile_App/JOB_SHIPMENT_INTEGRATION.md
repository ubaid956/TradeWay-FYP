# Job-to-Shipment Integration Guide

## Overview
This document explains how accepted driver jobs automatically become trackable shipments with Google Maps integration.

## System Flow

```
Driver accepts job → Shipment created → Shows in Assignments → Track in Google Maps
```

## Backend Changes

### 1. Job Model Updates
**File:** `server/models/Job.js`

Added shipment reference:
```javascript
shipment: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Shipment'
}
```

### 2. Job Controller - Auto-Create Shipment
**File:** `server/controllers/jobController.js`

#### assignJob Function
When a driver accepts a job, the system now:
1. Creates a Shipment document with proper GeoJSON locations
2. Converts job locations (lat/long) to GeoJSON Point format [longitude, latitude]
3. Sets estimated delivery time (+4 hours from acceptance)
4. Creates items array from job product details
5. Links shipment back to job

**Code Changes:**
```javascript
// Import added
import Shipment from '../models/Shipment.js';

// In assignJob function:
const shipment = new Shipment({
  orderId: job.order || job._id,
  driverId: driverId,
  origin: {
    location: {
      type: 'Point',
      coordinates: [
        job.origin?.longitude || 67.0011,
        job.origin?.latitude || 24.8607
      ]
    },
    address: job.origin?.address || '',
    city: job.origin?.city || ''
  },
  destination: {
    location: {
      type: 'Point',
      coordinates: [
        job.destination?.longitude || 67.0011,
        job.destination?.latitude || 24.8607
      ]
    },
    address: job.destination?.address || '',
    city: job.destination?.city || ''
  },
  status: 'pending',
  estimatedDeliveryTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
  items: [{
    name: job.product?.title || 'Unknown Item',
    quantity: 1,
    weight: job.cargoDetails?.weight || 0
  }]
});
await shipment.save();

job.shipment = shipment._id;
```

#### updateJobStatus Function
Status sync between Job and Shipment:
```javascript
// Job Status → Shipment Status mapping
const shipmentStatusMap = {
  'assigned': 'picked_up',
  'in_transit': 'in_transit',
  'delivered': 'delivered',
  'cancelled': 'cancelled'
};

// Auto-update shipment when job status changes
if (job.shipment) {
  await Shipment.findByIdAndUpdate(job.shipment, {
    status: shipmentStatusMap[status],
    $push: {
      statusHistory: {
        status: shipmentStatus,
        message: notes || `Status updated to ${status}`,
        timestamp: new Date()
      }
    },
    ...(status === 'delivered' ? { actualDeliveryTime: new Date() } : {})
  });
}
```

#### getDriverJobs Function
Added shipment population:
```javascript
const jobs = await Job.find({ $or: filter })
  .populate('product', 'title images')
  .populate('vendor', 'name phone')
  .populate('shipment')  // ← Added this
  .sort({ createdAt: -1 });
```

## Frontend Changes

### 1. Driver Assignments Screen
**File:** `Frontend/app/Driver/Assignments.tsx`

**Features:**
- Fetches driver jobs with populated shipments
- Filters only assigned/in_transit jobs
- Displays shipment status badges with color coding
- Shows ETA, distance, and weight information
- "Track Shipment" button links to Google Maps

**API Call:**
```typescript
const response = await axios.get(`${API_BASE_URL}/jobs/driver`, {
  headers: { Authorization: `Bearer ${token}` },
  params: { includeAssigned: true }
});

const activeJobs = response.data.data.filter((job: Assignment) => 
  ['assigned', 'in_transit'].includes(job.status)
);
```

**UI Components:**
- Status badges (Awaiting Pickup, En Route)
- Origin → Destination display
- Distance and weight chips
- ETA calculation
- Track Shipment button with navigation icon

### 2. Driver Tracking Screen
**File:** `Frontend/app/Driver/Tracking.tsx`

**Features:**
- Fetches jobs with shipments
- Real-time shipment status display
- Track Live button → TrackingDetail with Google Maps
- Optimize Route button → RouteOptimization
- Empty state when no active shipments

**Data Transformation:**
```typescript
const activeShipments = response.data.data
  .filter((job: any) => 
    job.shipment && ['assigned', 'in_transit'].includes(job.status)
  )
  .map((job: any) => ({
    ...job.shipment,
    jobId: job._id,
    orderId: job.order,
    origin: job.origin,
    destination: job.destination
  }));
```

**Status Icons & Colors:**
```typescript
// Status Colors
pending: '#f59e0b' (amber)
picked_up: '#3b82f6' (blue)
in_transit: '#10b981' (green)
delivered: '#6b7280' (gray)
delayed: '#ef4444' (red)

// Status Icons
pending: time-outline
picked_up: checkmark-circle-outline
in_transit: navigate-outline
delivered: checkmark-done-circle-outline
delayed: alert-circle-outline
```

## Navigation Flow

### Complete User Journey
1. **Jobs Screen** → Driver browses available jobs
2. **Accept Job** → Tap "Accept Job" button
   - Backend creates Shipment with GeoJSON locations
   - Job status → 'assigned'
   - Shipment status → 'pending'
3. **Assignments Screen** → View accepted job with shipment info
   - Shows ETA, distance, status
   - Tap "Track Shipment" button
4. **TrackingDetail Screen** → Google Maps with real-time tracking
   - Origin/destination markers
   - Driver location marker
   - Live GPS updates every 5 seconds
   - Progress calculation
5. **RouteOptimization Screen** → 3 AI-scored route options

### Navigation Parameters

**To TrackingDetail:**
```typescript
router.push({
  pathname: '/Shipment/TrackingDetail',
  params: { shipmentId: shipment._id }
});
```

**To RouteOptimization:**
```typescript
router.push({
  pathname: '/Shipment/RouteOptimization',
  params: {
    origin: JSON.stringify({ latitude, longitude }),
    destination: JSON.stringify({ latitude, longitude })
  }
});
```

## Data Models

### Job Schema
```javascript
{
  _id: ObjectId,
  driver: ObjectId,
  product: ObjectId,
  vendor: ObjectId,
  buyer: ObjectId,
  order: ObjectId,
  shipment: ObjectId,  // ← NEW
  status: 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled',
  origin: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String
  },
  destination: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String
  },
  cargoDetails: {
    weight: Number,
    quantity: Number,
    cargoType: String
  }
}
```

### Shipment Schema
```javascript
{
  _id: ObjectId,
  orderId: ObjectId,
  driverId: ObjectId,
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled',
  origin: {
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]  // GeoJSON format
    },
    address: String,
    city: String
  },
  destination: {
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    address: String,
    city: String
  },
  currentLocation: {
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    timestamp: Date
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  distance: Number,
  items: [{
    name: String,
    quantity: Number,
    weight: Number
  }],
  statusHistory: [{
    status: String,
    message: String,
    timestamp: Date
  }]
}
```

## Status Synchronization

### Job Status → Shipment Status Mapping
| Job Status | Shipment Status | Action |
|------------|----------------|--------|
| assigned | picked_up | Driver accepted job |
| in_transit | in_transit | Driver started delivery |
| delivered | delivered | Job completed, actualDeliveryTime set |
| cancelled | cancelled | Job cancelled |

### Automatic Updates
- When job status changes → shipment status updates
- When shipment delivered → order status → 'Completed'
- StatusHistory tracked in both Job and Shipment

## API Endpoints

### Get Driver Jobs with Shipments
```
GET /api/jobs/driver?includeAssigned=true
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "job123",
      "status": "assigned",
      "product": { "title": "Marble Tiles", ... },
      "origin": { "city": "Karachi", ... },
      "destination": { "city": "Lahore", ... },
      "shipment": {
        "_id": "shipment123",
        "status": "pending",
        "estimatedDeliveryTime": "2024-01-15T14:30:00Z",
        "distance": 1200000,
        "items": [...]
      }
    }
  ]
}
```

### Accept Job (Creates Shipment)
```
POST /api/jobs/:jobId/assign
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Job assigned successfully",
  "data": {
    "job": { ... },
    "shipment": {
      "_id": "new_shipment_id",
      "status": "pending",
      ...
    }
  }
}
```

### Update Job Status (Syncs Shipment)
```
POST /api/jobs/:jobId/status
Authorization: Bearer <token>
Body: { "status": "in_transit", "notes": "Started delivery" }

Response:
{
  "success": true,
  "message": "Job status updated",
  "data": { ... }
}
// Shipment status automatically updated to 'in_transit'
```

## Testing Checklist

### Backend Testing
- [ ] Accept job creates shipment with correct GeoJSON coordinates
- [ ] Shipment has proper origin/destination from job
- [ ] estimatedDeliveryTime is +4 hours from acceptance
- [ ] Items array populated from job.product
- [ ] Job.shipment reference saved correctly
- [ ] Status sync works (job → shipment)
- [ ] Delivered job updates order status
- [ ] /api/jobs/driver returns populated shipments

### Frontend Testing
- [ ] Assignments screen shows accepted jobs
- [ ] Shipment status badges display correctly
- [ ] ETA calculation accurate
- [ ] Track Shipment button navigates to TrackingDetail
- [ ] Tracking screen lists active shipments
- [ ] Status icons match shipment status
- [ ] Empty states show when no shipments
- [ ] Pull-to-refresh works
- [ ] TrackingDetail opens with correct shipmentId
- [ ] RouteOptimization receives proper coordinates

## Troubleshooting

### Shipment not appearing in Assignments
1. Check job status is 'assigned' or 'in_transit'
2. Verify job.shipment reference exists
3. Check token authorization
4. Ensure includeAssigned=true in API call

### GeoJSON Location Errors
- Order must be [longitude, latitude], not [lat, long]
- Coordinates must be numbers, not strings
- 2dsphere index required on location fields

### Status Not Syncing
- Check shipmentStatusMap in updateJobStatus
- Verify job.shipment exists before update
- Check Shipment.findByIdAndUpdate executes

### Navigation Issues
- shipmentId must be string, not object
- Use JSON.stringify for complex params
- Check router.push pathname matches file structure

## Environment Variables

### Backend (.env)
```env
GOOGLE_MAPS_API_KEY=AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs
```

### Frontend (.env)
```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs
EXPO_PUBLIC_API_URL=http://192.168.1.4:5000/api
```

## Next Steps

### Immediate Testing
1. Build app with EAS: `eas build --platform android --profile development`
2. Install APK on device
3. Accept a job as driver
4. Check Assignments screen for shipment
5. Tap Track Shipment
6. Verify Google Maps loads
7. Start tracking to send GPS updates

### Future Enhancements
- Push notifications for status changes
- Route history tracking
- Driver performance metrics
- Estimated time recalculation
- Traffic-aware ETA updates
- Proof of delivery (photo upload)
- Customer signature collection

## Related Documentation
- [GOOGLE_MAPS_INTEGRATION.md](./GOOGLE_MAPS_INTEGRATION.md) - Google Maps setup
- [QUICK_START_MAPS.md](./QUICK_START_MAPS.md) - Quick start guide
- [EAS_BUILD_CHECKLIST.md](./EAS_BUILD_CHECKLIST.md) - Build instructions
- [READY_TO_BUILD.md](./READY_TO_BUILD.md) - Final build status
