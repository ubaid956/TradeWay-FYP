// Shipment Tracking Types
// TypeScript interfaces for shipment tracking and route optimization

export interface Location {
  latitude: number;
  longitude: number;
}

export interface LocationWithTimestamp extends Location {
  timestamp: Date;
  speed?: number; // km/h
  heading?: number; // degrees
}

export interface ShipmentStatus {
  id: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  currentLocation?: Location;
  lastUpdate: Date;
  message: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
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
  pickupTime?: Date;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  currentStatus: ShipmentStatus;
  statusHistory: ShipmentStatus[];
  route?: Route;
  distance?: number; // in kilometers
  items: {
    name: string;
    quantity: number;
    weight?: number;
  }[];
}

export interface RouteWaypoint {
  location: Location;
  type: 'origin' | 'destination' | 'checkpoint' | 'rest_stop' | 'fuel_station';
  name: string;
  address?: string;
  eta?: Date;
  completed?: boolean;
}

export interface Route {
  id: string;
  name: string;
  distance: number; // in kilometers
  duration: number; // in seconds
  estimatedCost: number; // in PKR
  waypoints: RouteWaypoint[];
  polyline: string; // encoded polyline
  avoidsTolls: boolean;
  avoidsHighways: boolean;
  truckFriendly: boolean;
  warnings?: string[];
  traffic?: 'low' | 'medium' | 'high';
}

export interface OptimizedRoute extends Route {
  savings?: {
    distance: number; // km saved
    time: number; // minutes saved
    cost: number; // PKR saved
  };
  recommendation: 'fastest' | 'shortest' | 'cheapest' | 'balanced';
  aiScore: number; // 0-100
}

export interface DriverLocation {
  driverId: string;
  shipmentId: string;
  location: Location;
  timestamp: Date;
  speed: number;
  heading: number;
  accuracy: number;
}

export interface TrafficInfo {
  level: 'low' | 'medium' | 'high';
  delay: number; // in minutes
  description: string;
}

export interface RestStop {
  name: string;
  location: Location;
  type: 'rest_area' | 'fuel_station' | 'restaurant' | 'hotel';
  facilities: string[];
  rating?: number;
}
