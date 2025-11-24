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

import MessageHeader from '../Components/HomePage/MessageHeader';

const { height } = Dimensions.get('window');

const ChatMessage = () => {
  const { userId, productId } = useLocalSearchParams();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();

  // Get token from Redux store
  const { token } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (token) {
      setIsLoading(false);
    } else {
      Alert.alert('Authentication Required', 'Please login to continue');
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchUserAndMessages = async () => {
      try {
        console.log('Chat: Fetching user data for userId:', userId);
        console.log('Chat: Product context - productId:', productId);

        const userRes = await axios.get(
          `https://3d488f18f175.ngrok-free.app/api/auth/users/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUser(userRes.data.data);
        console.log('Chat: User data loaded:', userRes.data.data);

        const messagesRes = await axios.get(
          `https://3d488f18f175.ngrok-free.app/api/messages/private/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const formattedMessages = messagesRes.data.map((msg) => ({
          id: msg._id,
          text: msg.text,
          type: msg.sender._id === userId ? 'received' : 'sent',
          time: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

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
      } catch (error) {
        console.error('Error loading chat:', error);
      }
    };

    fetchUserAndMessages();
  }, [userId, token, productId]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const newMessage = {
      id: Date.now().toString(),
      text: input,
      type: 'sent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('Sending message to userId:', userId);
      console.log('Message text:', input);

      await axios.post(
        'https://3d488f18f175.ngrok-free.app/api/messages/private',
        { recipientId: userId, text: input },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Message sent successfully');
    } catch (err) {
      console.error('Error sending message:', err);
      if (err.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
        // Remove the message from UI if sending failed
        setMessages((prev) => prev.filter(msg => msg.id !== newMessage.id));
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

  if (isLoading || !token) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
              timestamp=""
              onMenuPress={() => console.log('Menu pressed')}
              profileImage="https://randomuser.me/api/portraits/women/44.jpg"
              userInitials={user?.name?.slice(0, 2).toUpperCase() || 'US'}
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
