import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import HomeHeader from '../Components/HomePage/HomeHeader';
import { globalStyles } from '@/Styles/globalStyles';
import { useLocalSearchParams } from 'expo-router';
import { GOOGLE_MAPS_CONFIG, MARKER_COLORS } from '@/src/config/maps';
import { OptimizedRoute, Location } from '@/src/types/shipment';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { apiConfig } from '@/src/config/api';

const { width, height } = Dimensions.get('window');

interface RouteOption extends OptimizedRoute {
  selected: boolean;
}

export default function RouteOptimization() {
  const params = useLocalSearchParams();
  const origin = params.origin ? JSON.parse(params.origin as string) : null;
  const destination = params.destination ? JSON.parse(params.destination as string) : null;
  
  const mapRef = useRef<MapView>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (origin && destination) {
      fetchOptimizedRoutes();
    } else {
      // Use default locations for demo
      fetchOptimizedRoutes();
    }
  }, []);

  const fetchOptimizedRoutes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      // Default locations (Karachi to Lahore)
      const originLoc = origin || { latitude: 24.8607, longitude: 67.0011 };
      const destLoc = destination || { latitude: 31.5204, longitude: 74.3587 };

      // Try to fetch from backend
      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/routes/optimize`,
          {
            origin: originLoc,
            destination: destLoc,
            vehicleType: 'truck',
            avoidTolls: GOOGLE_MAPS_CONFIG.truckRouting.avoidTolls,
          },
          {
            headers: {
              ...apiConfig.headers,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const optimizedRoutes = response.data.routes.map((route: OptimizedRoute, index: number) => ({
          ...route,
          selected: index === 0,
        }));

        setRoutes(optimizedRoutes);
        setSelectedRoute(optimizedRoutes[0]);
      } catch (error) {
        console.log('Using mock routes for demonstration');
        // Use mock routes for demonstration
        const mockRoutes = generateMockRoutes(originLoc, destLoc);
        setRoutes(mockRoutes);
        setSelectedRoute(mockRoutes[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching routes:', error);
      Alert.alert('Error', 'Failed to fetch optimized routes');
      setLoading(false);
    }
  };

  const generateMockRoutes = (origin: Location, dest: Location): RouteOption[] => {
    const baseDistance = 1200; // km
    const baseDuration = 14400; // 4 hours in seconds
    const baseCost = 15000; // PKR

    return [
      {
        id: 'route1',
        name: 'Fastest Route (M-2 Motorway)',
        distance: baseDistance,
        duration: baseDuration,
        estimatedCost: baseCost + 2000,
        waypoints: [
          { location: origin, type: 'origin', name: 'Starting Point' },
          { location: { latitude: 28.4212, longitude: 70.2989 }, type: 'checkpoint', name: 'Multan Rest Area' },
          { location: dest, type: 'destination', name: 'Destination' },
        ],
        polyline: '',
        avoidsTolls: false,
        avoidsHighways: false,
        truckFriendly: true,
        recommendation: 'fastest',
        aiScore: 95,
        savings: { distance: 0, time: 0, cost: 0 },
        traffic: 'low',
        selected: true,
      },
      {
        id: 'route2',
        name: 'Cheapest Route (National Highway)',
        distance: baseDistance + 150,
        duration: baseDuration + 3600,
        estimatedCost: baseCost - 3000,
        waypoints: [
          { location: origin, type: 'origin', name: 'Starting Point' },
          { location: { latitude: 27.7069, longitude: 68.8177 }, type: 'checkpoint', name: 'Sukkur' },
          { location: { latitude: 29.3544, longitude: 71.6911 }, type: 'checkpoint', name: 'Bahawalpur' },
          { location: dest, type: 'destination', name: 'Destination' },
        ],
        polyline: '',
        avoidsTolls: true,
        avoidsHighways: false,
        truckFriendly: true,
        recommendation: 'cheapest',
        aiScore: 82,
        savings: { distance: -150, time: -60, cost: 3000 },
        traffic: 'medium',
        warnings: ['Heavy traffic expected near Sukkur'],
        selected: false,
      },
      {
        id: 'route3',
        name: 'Balanced Route (Mix)',
        distance: baseDistance + 50,
        duration: baseDuration + 1800,
        estimatedCost: baseCost - 1000,
        waypoints: [
          { location: origin, type: 'origin', name: 'Starting Point' },
          { location: { latitude: 30.1575, longitude: 71.5249 }, type: 'fuel_station', name: 'Multan Fuel Stop' },
          { location: dest, type: 'destination', name: 'Destination' },
        ],
        polyline: '',
        avoidsTolls: false,
        avoidsHighways: false,
        truckFriendly: true,
        recommendation: 'balanced',
        aiScore: 88,
        savings: { distance: -50, time: -30, cost: 1000 },
        traffic: 'low',
        selected: false,
      },
    ];
  };

  const handleRouteSelect = (route: RouteOption) => {
    const updatedRoutes = routes.map(r => ({
      ...r,
      selected: r.id === route.id,
    }));
    setRoutes(updatedRoutes);
    setSelectedRoute(route);

    // Fit map to show the route
    if (mapRef.current && route.waypoints.length > 0) {
      const coordinates = route.waypoints.map(w => w.location);
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  };

  const handleStartNavigation = () => {
    if (!selectedRoute) return;

    Alert.alert(
      'Start Navigation',
      `Start navigation on ${selectedRoute.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            // Here you would integrate with navigation app or start in-app navigation
            Alert.alert('Success', 'Navigation started');
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (km: number): string => {
    return `${km.toFixed(0)} km`;
  };

  const formatCost = (cost: number): string => {
    return `PKR ${cost.toLocaleString()}`;
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'fastest':
        return '#3B82F6';
      case 'cheapest':
        return '#10B981';
      case 'balanced':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getRecommendationIcon = (recommendation: string): any => {
    switch (recommendation) {
      case 'fastest':
        return 'flash';
      case 'cheapest':
        return 'cash';
      case 'balanced':
        return 'scale';
      default:
        return 'information-circle';
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0758C2" />
        <Text style={styles.loadingText}>Calculating optimal routes...</Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { backgroundColor: '#f8f9fa' }]}>
      <HomeHeader title="Route Optimization" placeholder="" orders={false} profile={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={GOOGLE_MAPS_CONFIG.defaultRegion}
            onMapReady={() => {
              setMapReady(true);
              if (selectedRoute && selectedRoute.waypoints.length > 0) {
                setTimeout(() => {
                  const coordinates = selectedRoute.waypoints.map(w => w.location);
                  mapRef.current?.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
                    animated: true,
                  });
                }, 500);
              }
            }}
            showsTraffic={true}
          >
            {selectedRoute && selectedRoute.waypoints.length > 0 && (
              <>
                {/* Waypoint Markers */}
                {selectedRoute.waypoints.map((waypoint, index) => (
                  <Marker
                    key={index}
                    coordinate={waypoint.location}
                    title={waypoint.name}
                    pinColor={
                      waypoint.type === 'origin'
                        ? MARKER_COLORS.origin
                        : waypoint.type === 'destination'
                        ? MARKER_COLORS.destination
                        : MARKER_COLORS.checkpoint
                    }
                  />
                ))}

                {/* Route Directions */}
                {mapReady && selectedRoute.waypoints.length >= 2 && (
                  <MapViewDirections
                    origin={selectedRoute.waypoints[0].location}
                    destination={selectedRoute.waypoints[selectedRoute.waypoints.length - 1].location}
                    waypoints={selectedRoute.waypoints.slice(1, -1).map(w => w.location)}
                    apikey={GOOGLE_MAPS_CONFIG.apiKey}
                    strokeWidth={4}
                    strokeColor={getRecommendationColor(selectedRoute.recommendation)}
                    optimizeWaypoints={true}
                    mode="DRIVING"
                    onError={(error) => console.error('Directions error:', error)}
                  />
                )}
              </>
            )}
          </MapView>

          {/* AI Score Badge */}
          {selectedRoute && (
            <View style={styles.aiScoreBadge}>
              <Ionicons name="sparkles" size={16} color="#F59E0B" />
              <Text style={styles.aiScoreText}>AI Score: {selectedRoute.aiScore}</Text>
            </View>
          )}
        </View>

        {/* Route Options */}
        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>Available Routes</Text>
          
          {routes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeCard,
                route.selected && styles.routeCardSelected,
              ]}
              onPress={() => handleRouteSelect(route)}
            >
              <View style={styles.routeHeader}>
                <View style={styles.routeTitleRow}>
                  <Ionicons
                    name={getRecommendationIcon(route.recommendation)}
                    size={20}
                    color={getRecommendationColor(route.recommendation)}
                  />
                  <Text style={styles.routeName}>{route.name}</Text>
                </View>
                {route.selected && (
                  <Ionicons name="checkmark-circle" size={24} color="#0758C2" />
                )}
              </View>

              {/* Route Stats */}
              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{formatDuration(route.duration)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="navigate-outline" size={16} color="#6B7280" />
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>{formatDistance(route.distance)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="cash-outline" size={16} color="#6B7280" />
                  <Text style={styles.statLabel}>Est. Cost</Text>
                  <Text style={styles.statValue}>{formatCost(route.estimatedCost)}</Text>
                </View>
              </View>

              {/* Route Features */}
              <View style={styles.routeFeatures}>
                {route.avoidsTolls && (
                  <View style={styles.featureBadge}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.featureText}>No Tolls</Text>
                  </View>
                )}
                {route.truckFriendly && (
                  <View style={styles.featureBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.featureText}>Truck Friendly</Text>
                  </View>
                )}
                {route.traffic && (
                  <View style={styles.featureBadge}>
                    <Ionicons
                      name="car"
                      size={14}
                      color={
                        route.traffic === 'low'
                          ? '#10B981'
                          : route.traffic === 'medium'
                          ? '#F59E0B'
                          : '#EF4444'
                      }
                    />
                    <Text style={styles.featureText}>{route.traffic} traffic</Text>
                  </View>
                )}
              </View>

              {/* Warnings */}
              {route.warnings && route.warnings.length > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.warningText}>{route.warnings[0]}</Text>
                </View>
              )}

              {/* Savings Info */}
              {route.savings && route.savings.cost > 0 && (
                <View style={styles.savingsBox}>
                  <Ionicons name="trending-down" size={16} color="#10B981" />
                  <Text style={styles.savingsText}>
                    Save {formatCost(route.savings.cost)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation Button */}
        {selectedRoute && (
          <View style={styles.navigationSection}>
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={handleStartNavigation}
            >
              <Ionicons name="navigate" size={24} color="#fff" />
              <Text style={styles.navigationButtonText}>Start Navigation</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  mapContainer: {
    width: width,
    height: height * 0.35,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  aiScoreBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  aiScoreText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  routesSection: {
    paddingHorizontal: width * 0.05,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardSelected: {
    borderColor: '#0758C2',
    shadowColor: '#0758C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  routeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 8,
    fontWeight: '600',
  },
  navigationSection: {
    paddingHorizontal: width * 0.05,
    marginTop: 16,
  },
  navigationButton: {
    backgroundColor: '#0758C2',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
