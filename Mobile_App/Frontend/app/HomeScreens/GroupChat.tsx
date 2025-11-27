import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';

import { useAppSelector } from '@/src/store/hooks';
import { API_BASE_URL } from '@/src/config/api';
import MessageHeader from '../Components/HomePage/MessageHeader';

type MessageDirection = 'sent' | 'received';

interface ChatMessageItem {
  id: string;
  text: string;
  direction: MessageDirection;
  time: string;
  senderName?: string;
}

const { height } = Dimensions.get('window');

const GroupChat = () => {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef<FlatList<ChatMessageItem> | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { token, user: currentUser } = useAppSelector(state => state.auth);
  const currentUserId = (currentUser as any)?._id || (currentUser as any)?.id;

  useEffect(() => {
    if (!token) {
      Alert.alert('Authentication Required', 'Please login to continue');
      router.back();
    }
  }, [token]);

  const fetchGroupAndMessages = useCallback(async () => {
    if (!token || !groupId) return;

    try {
      setIsLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch group details
      const groupRes = await axios.get(`${API_BASE_URL}/groups`, { headers });
      const allGroups = groupRes.data || [];
      const foundGroup = allGroups.find((g: any) => g._id === groupId);
      setGroup(foundGroup);

      // Fetch messages
      const messagesRes = await axios.get(`${API_BASE_URL}/messages/${groupId}`, { headers });
      const messagesData = messagesRes.data || [];

      const formattedMessages: ChatMessageItem[] = messagesData.map((msg: any) => {
        const senderId = msg.sender?._id || msg.sender;
        const direction: MessageDirection = senderId === currentUserId ? 'sent' : 'received';

        return {
          id: msg._id || msg.id,
          text: msg.text || msg.message || '',
          direction,
          senderName: msg.sender?.name || 'Unknown',
          time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      });

      setMessages(formattedMessages);
    } catch (err: any) {
      console.error('Error fetching group data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  }, [token, groupId, currentUserId]);

  useEffect(() => {
    fetchGroupAndMessages();
  }, [fetchGroupAndMessages]);

  const handleSend = async () => {
    if (!input.trim() || !token || !groupId) return;

    const messageText = input.trim();
    setInput('');
    Keyboard.dismiss();

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_BASE_URL}/messages`,
        {
          groupId,
          text: messageText,
          type: 'text',
        },
        { headers }
      );

      await fetchGroupAndMessages();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageItem }) => {
    const isSent = item.direction === 'sent';

    return (
      <View style={[styles.messageContainer, isSent ? styles.sentContainer : styles.receivedContainer]}>
        {!isSent && item.senderName && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[styles.messageBubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
          <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.timeText, isSent ? styles.sentTime : styles.receivedTime]}>
          {item.time}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchGroupAndMessages}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
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
            <MessageHeader userName={group?.name || 'Group Chat'} />

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              style={{ flex: 1 }}
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '75%',
  },
  sentContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: '#2563EB',
  },
  receivedBubble: {
    backgroundColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 15,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#1f2937',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  sentTime: {
    marginRight: 12,
  },
  receivedTime: {
    marginLeft: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});

export default GroupChat;
