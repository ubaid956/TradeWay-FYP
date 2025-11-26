// Google Maps Configuration
// Maps API key and related settings for TradeWay app

export const GOOGLE_MAPS_CONFIG = {
  apiKey: 'AIzaSyBcQg9AYubqXDgtiPoACyI7e0wp8ORJkHs',
  
  // Default region for Pakistan
  defaultRegion: {
    latitude: 30.3753,
    longitude: 69.3451,
    latitudeDelta: 10,
    longitudeDelta: 10,
  },
  
  // Map style options
  mapStyle: 'standard', // standard, satellite, hybrid, terrain
  
  // Truck-specific routing preferences
  truckRouting: {
    avoidTolls: true,
    avoidHighways: false,
    avoidFerries: true,
    vehicleType: 'truck',
  },
  
  // Update intervals
  locationUpdateInterval: 5000, // 5 seconds
  routeRefreshInterval: 60000, // 1 minute
};

// Major cities in Pakistan for quick navigation
export const PAKISTAN_CITIES = {
  karachi: { latitude: 24.8607, longitude: 67.0011, name: 'Karachi' },
  lahore: { latitude: 31.5204, longitude: 74.3587, name: 'Lahore' },
  islamabad: { latitude: 33.6844, longitude: 73.0479, name: 'Islamabad' },
  faisalabad: { latitude: 31.4504, longitude: 73.1350, name: 'Faisalabad' },
  rawalpindi: { latitude: 33.5651, longitude: 73.0169, name: 'Rawalpindi' },
  multan: { latitude: 30.1575, longitude: 71.5249, name: 'Multan' },
  gujranwala: { latitude: 32.1877, longitude: 74.1945, name: 'Gujranwala' },
  peshawar: { latitude: 34.0151, longitude: 71.5249, name: 'Peshawar' },
  quetta: { latitude: 30.1798, longitude: 66.9750, name: 'Quetta' },
  sialkot: { latitude: 32.4945, longitude: 74.5229, name: 'Sialkot' },
};

// Map marker colors
export const MARKER_COLORS = {
  origin: '#10B981', // Green
  destination: '#EF4444', // Red
  driver: '#3B82F6', // Blue
  checkpoint: '#F59E0B', // Amber
  warehouse: '#8B5CF6', // Purple
};
