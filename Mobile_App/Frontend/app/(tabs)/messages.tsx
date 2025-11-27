import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { globalStyles } from '@/Styles/globalStyles';
import HomeHeader from '../Components/HomePage/HomeHeader';
import MessageComponent from '../Components/HomePage/MessagesComonent';
import { API_BASE_URL } from '@/src/config/api';

const { width } = Dimensions.get('window');
const defaultAvatar = require('../../assets/images/home/user.png');

// Create a dispute icon component
const DisputeIcon = () => (
  <View style={styles.disputeIconContainer}>
    <Ionicons name="alert-circle" size={40} color="#ef4444" />
  </View>
);

const Messages = () => {
  const router = useRouter();
  const currentUser = useAppSelector(state => state.auth.user);
  
  const [activeTab, setActiveTab] = useState<'all' | 'disputes'>('all');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchUsers();
    } else {
      fetchDisputeGroups();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('userToken'));
      if (!token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL.replace(/\/$/, '')}/auth/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const allUsers = response.data.data || response.data || [];
      
      // Filter out the logged-in user
      const filteredUsers = allUsers.filter((user: any) => user._id !== currentUser?._id);
      
      setUsers(filteredUsers);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeGroups = async () => {
    try {
      setLoading(true);
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('userToken'));
      if (!token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL.replace(/\/$/, '')}/groups`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const allGroups = response.data || [];
      
      // Filter only dispute type groups
      const disputeGroups = allGroups.filter((group: any) => group.type === 'dispute');
      
      setGroups(disputeGroups);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load dispute groups');
      console.error('Error fetching dispute groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessagePress = (user: any) => {
    if (!user?._id) {
      console.error('Invalid user data:', user);
      return;
    }
    router.push({
      pathname: '/HomeScreens/ChatMessage',
      params: { userId: user._id },
    });
  };

  const handleGroupPress = (group: any) => {
    if (!group?._id) {
      console.error('Invalid group data:', group);
      return;
    }
    // Navigate to GroupChat screen with groupId
    router.push({
      pathname: '/HomeScreens/GroupChat',
      params: { groupId: group._id },
    });
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <HomeHeader title="Messages" placeholder="Search messages" />
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'disputes' && styles.activeTab]}
          onPress={() => setActiveTab('disputes')}
        >
          <Text style={[styles.tabText, activeTab === 'disputes' && styles.activeTabText]}>
            Disputes
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
        </View>
      )}

      {activeTab === 'all' ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const profileImage =
              item?.pic && item.pic !== 'null'
                ? { uri: item.pic }
                : defaultAvatar;

            return (
              <MessageComponent
                name={item.name || 'User'}
                message={item.lastPreviewMessage || 'Tap to start chatting'}
                time={item.lastPreviewTime || ''}
                unreadCount={item.unreadCount || 0}
                profileImage={profileImage}
                onPress={() => handleMessagePress(item)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            // Use dispute icon for dispute groups
            return (
              <MessageComponent
                name={item.name || 'Dispute Group'}
                message="Tap to open dispute chat with buyer, vendor & admin"
                time=""
                unreadCount={0}
                profileImage={null}
                customIcon={<DisputeIcon />}
                onPress={() => handleGroupPress(item)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No Disputed order</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    marginHorizontal: width * 0.05,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  disputeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Messages;
