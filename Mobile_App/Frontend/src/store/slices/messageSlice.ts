import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/apiService';

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    type: 'text' | 'image' | 'file';
    attachments?: string[];
}

export interface Chat {
    id: string;
    participants: {
        id: string;
        name: string;
        profileImage?: string;
    }[];
    lastMessage?: Message;
    unreadCount: number;
    updatedAt: string;
}

interface MessageState {
    chats: Chat[];
    currentChat: Chat | null;
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    isSending: boolean;
    isConnected: boolean;
}

const initialState: MessageState = {
    chats: [],
    currentChat: null,
    messages: [],
    isLoading: false,
    error: null,
    isSending: false,
    isConnected: false,
};

// Async thunks for message operations
export const fetchChats = createAsyncThunk(
    'message/fetchChats',
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await apiService.messages.getChats(userId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch chats');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMessages = createAsyncThunk(
    'message/fetchMessages',
    async ({ chatId, page = 1, limit = 50 }: { chatId: string; page?: number; limit?: number }, { rejectWithValue }) => {
        try {
            const response = await apiService.messages.getMessages(chatId, page, limit);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch messages');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const sendMessage = createAsyncThunk(
    'message/sendMessage',
    async ({ chatId, content, type = 'text', attachments }: {
        chatId: string;
        content: string;
        type?: 'text' | 'image' | 'file';
        attachments?: string[];
    }, { rejectWithValue }) => {
        try {
            const response = await apiService.messages.sendMessage(chatId, content, type, attachments);

            if (!response.success) {
                throw new Error(response.error || 'Failed to send message');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createChat = createAsyncThunk(
    'message/createChat',
    async ({ participantIds }: { participantIds: string[] }, { rejectWithValue }) => {
        try {
            const response = await apiService.messages.createChat(participantIds);

            if (!response.success) {
                throw new Error(response.error || 'Failed to create chat');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const markMessagesAsRead = createAsyncThunk(
    'message/markMessagesAsRead',
    async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }, { rejectWithValue }) => {
        try {
            const response = await apiService.messages.markMessagesAsRead(chatId, messageIds);

            if (!response.success) {
                throw new Error(response.error || 'Failed to mark messages as read');
            }

            return { chatId, messageIds };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const messageSlice = createSlice({
    name: 'message',
    initialState,
    reducers: {
        clearMessageError: (state) => {
            state.error = null;
        },
        setCurrentChat: (state, action: PayloadAction<Chat | null>) => {
            state.currentChat = action.payload;
        },
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload);
        },
        updateMessage: (state, action: PayloadAction<Message>) => {
            const index = state.messages.findIndex(m => m.id === action.payload.id);
            if (index !== -1) {
                state.messages[index] = action.payload;
            }
        },
        setConnectionStatus: (state, action: PayloadAction<boolean>) => {
            state.isConnected = action.payload;
        },
        updateChatLastMessage: (state, action: PayloadAction<{ chatId: string; message: Message }>) => {
            const chat = state.chats.find(c => c.id === action.payload.chatId);
            if (chat) {
                chat.lastMessage = action.payload.message;
                chat.updatedAt = action.payload.message.timestamp;
            }
        },
        incrementUnreadCount: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find(c => c.id === action.payload);
            if (chat) {
                chat.unreadCount += 1;
            }
        },
        resetUnreadCount: (state, action: PayloadAction<string>) => {
            const chat = state.chats.find(c => c.id === action.payload);
            if (chat) {
                chat.unreadCount = 0;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch chats
            .addCase(fetchChats.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchChats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.chats = action.payload;
                state.error = null;
            })
            .addCase(fetchChats.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch messages
            .addCase(fetchMessages.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.messages = action.payload;
                state.error = null;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Send message
            .addCase(sendMessage.pending, (state) => {
                state.isSending = true;
                state.error = null;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isSending = false;
                state.messages.push(action.payload);
                state.error = null;
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.isSending = false;
                state.error = action.payload as string;
            })
            // Create chat
            .addCase(createChat.fulfilled, (state, action) => {
                state.chats.push(action.payload);
            })
            // Mark messages as read
            .addCase(markMessagesAsRead.fulfilled, (state, action) => {
                state.messages.forEach(message => {
                    if (action.payload.messageIds.includes(message.id)) {
                        message.isRead = true;
                    }
                });
            });
    },
});

export const {
    clearMessageError,
    setCurrentChat,
    addMessage,
    updateMessage,
    setConnectionStatus,
    updateChatLastMessage,
    incrementUnreadCount,
    resetUnreadCount
} = messageSlice.actions;
export default messageSlice.reducer;
