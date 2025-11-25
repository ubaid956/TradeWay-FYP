import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, useRouter } from "expo-router";
import { ReactNode, useEffect } from 'react';
import { useAppSelector } from '@/src/store/hooks';

import { Dimensions, Platform, StyleSheet, View } from "react-native";

const { height, width } = Dimensions.get("window");

type TabName = 'index' | 'order' | 'post' | 'messages' | 'profile';

type TabConfig = {
  name: TabName;
  label: string;
  icon: ({ focused, color }: { focused: boolean; color: string }) => ReactNode;
  href?: string;
};

const ACTIVE_COLOR = '#0758C2';
const INACTIVE_COLOR = '#a0a0a0';

const iconColor = (focused: boolean) => (focused ? ACTIVE_COLOR : INACTIVE_COLOR);

const buyerTabs: TabConfig[] = [
  {
    name: 'index',
    label: 'Home',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'order',
    label: 'Track Proposals',
    icon: ({ focused }) => (
      <MaterialCommunityIcons
        name={focused ? 'clipboard-text' : 'clipboard-text-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'post',
    label: 'Requirement Posting',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'add-circle' : 'add-circle-outline'}
        size={26}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'chatbubble' : 'chatbubble-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: ({ focused }) => (
      <FontAwesome5
        name={focused ? 'user-alt' : 'user'}
        size={20}
        color={iconColor(focused)}
      />
    ),
  },
];

const vendorTabs: TabConfig[] = [
  {
    name: 'index',
    label: 'Home',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'order',
    label: 'Orders',
    icon: ({ focused }) => (
      <MaterialCommunityIcons
        name={focused ? 'truck' : 'truck-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'post',
    label: 'Manage Listings',
    icon: () => (
      <View style={styles.postIconContainer}>
        <MaterialCommunityIcons
          name="format-list-bulleted-square"
          size={22}
          color="#ffffff"
        />
      </View>
    ),
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'chatbubble' : 'chatbubble-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: ({ focused }) => (
      <FontAwesome5
        name={focused ? 'user-alt' : 'user'}
        size={20}
        color={iconColor(focused)}
      />
    ),
  },
];

const driverTabs: TabConfig[] = [
  {
    name: 'index',
    label: 'Jobs',
    icon: ({ focused }) => (
      <MaterialCommunityIcons
        name={focused ? 'briefcase' : 'briefcase-outline'}
        size={22}
        color={iconColor(focused)}
      />
    ),
    href: '/Driver/Jobs',
  },
  {
    name: 'order',
    label: 'Assignments',
    icon: ({ focused }) => (
      <MaterialCommunityIcons
        name={focused ? 'truck-delivery' : 'truck'}
        size={22}
        color={iconColor(focused)}
      />
    ),
    href: '/Driver/Assignments',
  },
  {
    name: 'post',
    label: 'Tracking',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'navigate' : 'navigate-outline'}
        size={22}
        color={iconColor(focused)}
      />
    ),
    href: '/Driver/Tracking',
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: ({ focused }) => (
      <Ionicons
        name={focused ? 'chatbubble' : 'chatbubble-outline'}
        size={24}
        color={iconColor(focused)}
      />
    ),
    href: '/Driver/Messages',
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: ({ focused }) => (
      <FontAwesome5
        name={focused ? 'user-alt' : 'user'}
        size={20}
        color={iconColor(focused)}
      />
    ),
    href: '/Driver/Profile',
  },
];

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAppSelector(state => state.auth);
  const role = (user?.role || '').toLowerCase();
  const isDriver = role === 'driver';
  const isBuyer = role === 'buyer';

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

  const tabConfigs = isDriver ? driverTabs : isBuyer ? buyerTabs : vendorTabs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
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
      {tabConfigs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: tab.icon,
          }}
          {...(tab.href ? { href: tab.href } : {})}
        />
      ))}
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