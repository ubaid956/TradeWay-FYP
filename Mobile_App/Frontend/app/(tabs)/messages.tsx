import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
// import { useAppSelector } from '../store/hooks';
import { useAppSelector } from '@/src/store/hooks';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { globalStyles } from '@/Styles/globalStyles';
import HomeHeader from '../Components/HomePage/HomeHeader';
import MessageComponent from '../Components/HomePage/MessagesComonent';
// import { API_BASE_URL } from '../config/api';
import { API_BASE_URL } from '@/src/config/api';

const defaultAvatar = require('../../assets/images/home/user.png');

const Messages = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
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

        setUsers(response.data.data || response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load users');
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // messages list is the same for all roles; no role-based redirect here

  const handleMessagePress = (user) => {
    if (!user?._id) {
      console.error('Invalid user data:', user);
      return;
    }
    router.push({
      pathname: '/HomeScreens/ChatMessage',
      params: { userId: user._id },
    });
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <HomeHeader title="Messages" placeholder="Search messages" />
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
      />
    </View>
  );
};

export default Messages;
