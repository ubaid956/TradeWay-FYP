import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import { API_BASE_URL } from '../config/api';

import MessageHeader from '../Components/HomePage/MessageHeader';

const { height } = Dimensions.get('window');

const ChatMessage = () => {
  const { userId, productId } = useLocalSearchParams();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  // Get token and current user from Redux store
  const { token, user: currentUser } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (token) {
      setIsLoading(false);
    } else {
      Alert.alert('Authentication Required', 'Please login to continue');
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token || !userId) return;

    const fetchUserAndMessages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Chat: Fetching user data for userId:', userId);
        console.log('Chat: Current logged-in user:', currentUser?._id);
        console.log('Chat: Product context - productId:', productId);

        // Fetch the other user's profile
        const userRes = await axios.get(
          `${API_BASE_URL}/auth/users/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const userData = userRes.data.data || userRes.data;
        setUser(userData);
        console.log('Chat: User data loaded:', userData);

        // Fetch messages between current user and the other user
        const messagesRes = await axios.get(
          `${API_BASE_URL}/messages/private/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const messagesData = messagesRes.data.data || messagesRes.data || [];
        const currentUserId = currentUser?._id || currentUser?.id;

        const formattedMessages = messagesData.map((msg) => {
          const senderId = msg.sender?._id || msg.sender || msg.senderId;
          const isSent = senderId === currentUserId;
          
          return {
            id: msg._id || msg.id,
            text: msg.text || msg.message || '',
            type: isSent ? 'sent' : 'received',
            time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
        });

        // Add product context message if this is a new conversation and productId is provided
        if (formattedMessages.length === 0 && productId) {
          const productContextMessage = {
            id: 'product-context',
            text: `Hi! I'm interested in the product you're selling. Could you tell me more about it?`,
            type: 'sent',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          formattedMessages.push(productContextMessage);
        }

        setMessages(formattedMessages);
        console.log('Chat: Messages loaded:', formattedMessages.length);
      } catch (error) {
        console.error('Error loading chat:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load chat');
        Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndMessages();
  }, [userId, token, productId, currentUser?._id]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const messageText = input.trim();
    const tempId = Date.now().toString();
    
    const newMessage = {
      id: tempId,
      text: messageText,
      type: 'sent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('Sending message to userId:', userId);
      console.log('Message text:', messageText);

      const response = await axios.post(
        `${API_BASE_URL}/messages/private`,
        { recipientId: userId, text: messageText },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Message sent successfully:', response.data);

      // Replace temp message with actual message from server
      if (response.data) {
        const serverMessage = response.data.data || response.data;
        setMessages((prev) => {
          const filtered = prev.filter(msg => msg.id !== tempId);
          return [...filtered, {
            id: serverMessage._id || serverMessage.id || tempId,
            text: serverMessage.text || messageText,
            type: 'sent',
            time: new Date(serverMessage.createdAt || Date.now()).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          }];
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove the optimistic message if sending failed
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
      
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
      } else {
        Alert.alert('Error', err.response?.data?.message || 'Failed to send message. Please try again.');
      }
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.type === 'sent' ? styles.sent : styles.received,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          item.type === 'received' && { color: '#000' },
        ]}
      >
        {item.text}
      </Text>
      <Text style={styles.timeText}>{item.time}</Text>
    </View>
  );

  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading chat...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Authentication required</Text>
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#d32f2f', textAlign: 'center', marginBottom: 10 }}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            setIsLoading(true);
            // Retry loading
            if (token && userId) {
              const fetchUserAndMessages = async () => {
                try {
                  const userRes = await axios.get(
                    `${API_BASE_URL}/auth/users/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  setUser(userRes.data.data || userRes.data);
                  
                  const messagesRes = await axios.get(
                    `${API_BASE_URL}/messages/private/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  const messagesData = messagesRes.data.data || messagesRes.data || [];
                  const currentUserId = currentUser?._id || currentUser?.id;
                  const formattedMessages = messagesData.map((msg) => {
                    const senderId = msg.sender?._id || msg.sender || msg.senderId;
                    return {
                      id: msg._id || msg.id,
                      text: msg.text || msg.message || '',
                      type: senderId === currentUserId ? 'sent' : 'received',
                      time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    };
                  });
                  setMessages(formattedMessages);
                } catch (err) {
                  setError(err.response?.data?.message || err.message);
                } finally {
                  setIsLoading(false);
                }
              };
              fetchUserAndMessages();
            }
          }}
          style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 8 }}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get user's profile image or use default
  const profileImage = user?.pic && user.pic !== 'null' && user.pic !== 'undefined'
    ? user.pic 
    : null; // MessageHeader will handle fallback
  
  const userInitials = user?.name 
    ? user.name.slice(0, 2).toUpperCase() 
    : 'US';

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <MessageHeader
              onBackPress={() => navigation.goBack()}
              userName={user?.name || 'User'}
              timestamp={user?.lastActive ? new Date(user.lastActive).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }) : ''}
              onMenuPress={() => console.log('Menu pressed')}
              profileImage={profileImage}
              userInitials={userInitials}
            />

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.chatContainer}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Message..."
                style={styles.input}
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity onPress={handleSend}>
                <Ionicons name="send" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};
// ... keep all your existing styles ...
const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  chatContainer: {
    padding: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  sent: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  received: {
    backgroundColor: '#e4e6eb',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
  },
  timeText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: height * 0.2,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
});

export default ChatMessage;
