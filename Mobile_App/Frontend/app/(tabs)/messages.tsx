import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { globalStyles } from '@/Styles/globalStyles';
import HomeHeader from '../Components/HomePage/HomeHeader';
import MessageComponent from '../Components/HomePage/MessagesComonent';

const Messages = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setError('Authentication token not found.');
          return;
        }

        const response = await axios.get('https://3d488f18f175.ngrok-free.app/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUsers(response.data.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleMessagePress = (user) => {
    navigation.navigate('HomeScreens/ChatMessage', { userId: user._id });
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
        renderItem={({ item }) => (
          <MessageComponent
            name={item.name}
            message={item.lastPreviewMessage}
            time={item.lastPreviewTime}
            unreadCount={0}
            profileImage={require('../../assets/images/home/user.png')}
            onPress={() => handleMessagePress(item)}
          />
        )}
      />
    </View>
  );
};

export default Messages;
