import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from "expo-router";
import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';

import { Dimensions, Platform, StyleSheet, View } from "react-native";

const { height, width } = Dimensions.get("window");

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAppSelector(state => state.auth);
  const role = (user?.role || '').toLowerCase();
  const isDriver = role === 'driver';

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.replace('/Signup-Login/Login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render tabs if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Wait until auth is fully loaded so we can correctly render role-specific tabs
  if (isLoading) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#0758C2",
        tabBarInactiveTintColor: "#a0a0a0",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 5,
        },
        tabBarStyle: {
          backgroundColor: "#f4f4f4",
          height: height * 0.09,
          borderTopWidth: 0.5,
          borderTopColor: "#dcdcdc",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 10,
        },
      }}
    >
      {/* Always render exactly five tabs. For drivers, point them to /Driver/* pages via href and change labels/icons. */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: isDriver ? 'Jobs' : 'Home',
          tabBarIcon: ({ focused }) => (
            isDriver ? (
              <MaterialCommunityIcons
                name={focused ? 'briefcase' : 'briefcase-outline'}
                size={22}
                color={focused ? '#0758C2' : '#a0a0a0'}
              />
            ) : (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={focused ? '#0758C2' : '#a0a0a0'}
              />
            )
          ),
        }}
        {...(isDriver ? { href: '/Driver/Jobs' } : {})}
      />

      <Tabs.Screen
        name="order"
        options={{
          tabBarLabel: isDriver ? 'Assignments' : 'Orders',
          tabBarIcon: ({ focused }) => (
            isDriver ? (
              <MaterialCommunityIcons
                name={focused ? 'truck-delivery' : 'truck'}
                size={22}
                color={focused ? '#0758C2' : '#a0a0a0'}
              />
            ) : (
              <MaterialCommunityIcons
                name={focused ? 'truck' : 'truck-outline'}
                size={24}
                color={focused ? '#0758C2' : '#a0a0a0'}
              />
            )
          ),
        }}
        {...(isDriver ? { href: '/Driver/Assignments' } : {})}
      />

      <Tabs.Screen
        name="post"
        options={{
          tabBarLabel: isDriver ? 'Tracking' : 'Post',
          tabBarIcon: ({ focused }) => (
            isDriver ? (
              <Ionicons
                name={focused ? 'navigate' : 'navigate-outline'}
                size={22}
                color={focused ? '#0758C2' : '#a0a0a0'}
              />
            ) : (
              <View style={styles.postIconContainer}>
                <MaterialCommunityIcons
                  name="format-list-bulleted-square"
                  size={22}
                  color="#ffffff"
                />
              </View>
            )
          ),
        }}
        {...(isDriver ? { href: '/Driver/Tracking' } : {})}
      />

      <Tabs.Screen
        name="messages"
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'chatbubble' : 'chatbubble-outline'}
              size={24}
              color={focused ? '#0758C2' : '#a0a0a0'}
            />
          ),
        }}
        {...(isDriver ? { href: '/Driver/Messages' } : {})}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <FontAwesome5
              name={focused ? 'user-alt' : 'user'}
              size={20}
              color={focused ? '#0758C2' : '#a0a0a0'}
            />
          ),
        }}
        {...(isDriver ? { href: '/Driver/Profile' } : {})}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  postIconContainer: {
    backgroundColor: "#0758C2",
    borderRadius: 40,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
});