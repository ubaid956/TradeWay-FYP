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
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';

import { useAppSelector } from '@/src/store/hooks';
import { API_BASE_URL } from '@/src/config/api';
import apiService from '@/src/services/apiService';
import { formatCurrency } from '@/src/utils/currency';
import { useStripeReady } from '../_layout';

import MessageHeader from '../Components/HomePage/MessageHeader';

type MessageDirection = 'sent' | 'received';
type MessageKind = 'text' | 'invoice';

interface ChatMessageItem {
  id: string;
  text: string;
  direction: MessageDirection;
  messageType: MessageKind;
  time: string;
  metadata?: any;
}

const { height } = Dimensions.get('window');

const ChatMessage = () => {
  const { userId, productId } = useLocalSearchParams();
  const flatListRef = useRef<FlatList<ChatMessageItem> | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<string | null>(null);

  const navigation = useNavigation();
  const { token, user: currentUser } = useAppSelector(state => state.auth);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const stripeReady = useStripeReady();

  const currentUserId = (currentUser as any)?._id || (currentUser as any)?.id;

  useEffect(() => {
    if (!token) {
      Alert.alert('Authentication Required', 'Please login to continue');
    }
  }, [token]);

  const fetchUserAndMessages = useCallback(async () => {
    if (!token || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const headers = { Authorization: `Bearer ${token}` };

      const userRes = await axios.get(`${API_BASE_URL}/auth/users/${userId}`, { headers });
      const userData = userRes.data?.data || userRes.data;
      setUser(userData);

      const messagesRes = await axios.get(`${API_BASE_URL}/messages/private/${userId}`, { headers });
      const messagesData = messagesRes.data?.data || messagesRes.data || [];

      const formattedMessages: ChatMessageItem[] = messagesData.map((msg: any) => {
        const senderId = msg.sender?._id || msg.sender || msg.senderId;
        const direction: MessageDirection = senderId === currentUserId ? 'sent' : 'received';
        const messageType: MessageKind = (msg.type as MessageKind) || 'text';
        const metadata = msg.metadata ?? null;

        return {
          id: msg._id || msg.id,
          text: msg.text || msg.message || '',
          direction,
          messageType,
          metadata,
          time: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      });

      if (formattedMessages.length === 0 && productId) {
        formattedMessages.push({
          id: 'product-context',
          text: "Hi! I'm interested in this product. Could you tell me more?",
          direction: 'sent',
          messageType: 'text',
          metadata: null,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      setMessages(formattedMessages);
    } catch (err: any) {
      console.error('Error loading chat:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to load chat';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  }, [token, userId, productId, currentUserId]);

  useEffect(() => {
    fetchUserAndMessages();
  }, [fetchUserAndMessages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const messageText = input.trim();
    const tempId = Date.now().toString();

    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      text: messageText,
      direction: 'sent',
      messageType: 'text',
      metadata: null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInput('');

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    try {
      const response = await axios.post(
        `${API_BASE_URL}/messages/private`,
        { recipientId: userId, text: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        const serverMessage = response.data.data || response.data;
        const persistedMessage: ChatMessageItem = {
          id: serverMessage._id || serverMessage.id || tempId,
          text: serverMessage.text || messageText,
          direction: 'sent',
          messageType: (serverMessage.type as MessageKind) || 'text',
          metadata: serverMessage.metadata || null,
          time: new Date(serverMessage.createdAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };

        setMessages(prev => {
          const remaining = prev.filter(msg => msg.id !== tempId);
          return [...remaining, persistedMessage];
        });
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));

      if (err?.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again');
      } else {
        Alert.alert('Error', err?.response?.data?.message || 'Failed to send message. Please try again.');
      }
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    if (!invoiceId) return;

    if (!stripeReady) {
      Alert.alert('Payment not ready', 'Payment system is still loading. Please try again in a moment.');
      return;
    }

    try {
      setProcessingInvoiceId(invoiceId);
      const response = await apiService.payments.createInvoicePaymentIntent(invoiceId);
      if (!response.success) {
        // Show the actual error message from backend
        const errorMessage = response.error || response.message || 'Failed to initialize payment';
        throw new Error(errorMessage);
      }

      const clientSecret = response.data?.clientSecret || response.data?.client_secret || response.data;
      if (!clientSecret) {
        throw new Error('Missing payment information');
      }

      const initResult = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'TradeWay',
      });

      if (initResult.error) {
        throw new Error(initResult.error.message || 'Failed to start payment');
      }

      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        throw new Error(paymentResult.error.message || 'Payment was cancelled');
      }

      // Payment succeeded! Call manual processing endpoint to create order
      Alert.alert('Payment successful', 'Processing your order...');
      
      try {
        const processResult = await apiService.payments.processInvoicePayment(invoiceId);
        if (processResult.success) {
          Alert.alert('Order created', 'Your order has been created successfully!');
          await fetchUserAndMessages();
        } else {
          // Fallback: poll invoice status
          console.log('Manual processing failed, polling invoice status...');
          let attempts = 0;
          const maxAttempts = 10;
          const checkInterval = setInterval(async () => {
            attempts++;
            try {
              const invoiceCheck = await apiService.invoices.getInvoiceById(invoiceId);
              if (invoiceCheck.success && invoiceCheck.data?.status === 'paid') {
                clearInterval(checkInterval);
                Alert.alert('Payment complete', 'Invoice has been paid successfully.');
                await fetchUserAndMessages();
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                Alert.alert('Payment processing', 'Your payment was successful. The order will appear shortly.');
                await fetchUserAndMessages();
              }
            } catch (err) {
              console.warn('Error checking invoice status:', err);
            }
          }, 1000);
        }
      } catch (processErr) {
        console.error('Manual processing error:', processErr);
        Alert.alert('Payment successful', 'Your order will be created shortly.');
        await fetchUserAndMessages();
      }

    } catch (err: any) {
      console.error('Invoice payment error:', err);
      Alert.alert('Payment error', err?.message || 'Unable to process payment.');
    } finally {
      setProcessingInvoiceId(null);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessageItem }) => {
    if (item.messageType === 'invoice' && item.metadata?.invoiceId) {
      const invoiceStatus = item.metadata?.status || 'sent';
      const totalAmount = Number(item.metadata?.totalAmount || 0);
      const invoiceNumber = item.metadata?.invoiceNumber || 'Invoice';
      const isBuyerView = item.direction === 'received';
      const isPaid = invoiceStatus === 'paid';
      const isProcessing = processingInvoiceId === item.metadata.invoiceId;

      return (
        <View
          style={[
            styles.messageContainer,
            item.direction === 'sent' ? styles.sentAlign : styles.receivedAlign,
            styles.invoiceMessage,
          ]}
        >
          <Text style={styles.invoiceTitle}>{invoiceNumber}</Text>
          {item.metadata?.productTitle ? (
            <Text style={styles.invoiceSubtitle}>{item.metadata.productTitle}</Text>
          ) : null}
          <Text style={styles.invoiceAmount}>{formatCurrency(totalAmount, { fractionDigits: 2 })}</Text>
          <Text style={styles.invoiceStatusText}>
            {isPaid ? 'Paid' : 'Awaiting payment'}
            {isPaid && item.metadata?.paidAt
              ? ` · ${new Date(item.metadata.paidAt).toLocaleDateString()}`
              : ''}
          </Text>
          <Text style={styles.invoiceMeta}>Qty {item.metadata?.quantity || 1}</Text>
          {isBuyerView && !isPaid ? (
            <TouchableOpacity
              style={[
                styles.invoicePayButton,
                (!stripeReady || isProcessing) && styles.disabledButton
              ]}
              onPress={() => handlePayInvoice(item.metadata.invoiceId)}
              disabled={!stripeReady || isProcessing}
            >
              <Text style={styles.invoicePayButtonText}>
                {isProcessing ? 'Processing…' : !stripeReady ? 'Loading payment…' : `Pay ${formatCurrency(totalAmount, { fractionDigits: 2 })}`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          item.direction === 'sent' ? styles.sent : styles.received,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.direction === 'received' && styles.receivedText,
          ]}
        >
          {item.text}
        </Text>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
    );
  };

  if (isLoading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.centeredText}>Loading chat...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>Authentication required</Text>
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={[styles.centered, { padding: 20 }]}>
        <Text style={[styles.centeredText, { color: '#d32f2f', marginBottom: 10 }]}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            fetchUserAndMessages();
          }}
          style={styles.retryButton}
        >
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profileImage = user?.pic && user.pic !== 'null' && user.pic !== 'undefined'
    ? user.pic
    : null;

  const userInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'US';

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
              timestamp={user?.lastActive
                ? new Date(user.lastActive).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
              onMenuPress={() => undefined}
              profileImage={profileImage}
              userInitials={userInitials}
            />

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.chatContainer}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredText: {
    color: '#666',
  },
  chatContainer: {
    padding: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  sentAlign: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  receivedAlign: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
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
  receivedText: {
    color: '#000',
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
  retryButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  invoiceMessage: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  invoiceTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
  },
  invoiceSubtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
    marginTop: 8,
  },
  invoiceStatusText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 6,
  },
  invoiceMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  invoicePayButton: {
    marginTop: 12,
    backgroundColor: '#0758C2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  invoicePayButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ChatMessage;
