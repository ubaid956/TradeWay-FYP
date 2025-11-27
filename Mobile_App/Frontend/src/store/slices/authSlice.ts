import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/apiService';

export interface User {
    _id: string;
    email: string;
    name: string;
    phone?: string;
    profileImage?: string;
    isKYCVerified: boolean;
    role: string;
    authType?: string;
    pushToken?: string | null;
    language?: string;
    rating?: number;
    otp?: string | null;
    otpExpiresAt?: string | null;
    createdAt: string;
    __v?: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading true to show loading screen
    error: null,
};

// Async thunks for authentication
export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials: { email: string; password: string; pushToken?: string | null }, { rejectWithValue }) => {
        try {
            const response = await apiService.auth.login(credentials);

            if (!response.success) {
                throw new Error(response.error || 'Login failed');
            }

            // Handle your backend's response structure
            const responseData = response.data;

            // Your backend returns the user data directly with token field
            if (responseData.token) {
                const token = responseData.token;
                // Extract user data from the response (everything except token)
                const { token: _, ...userData } = responseData;
                const user = userData;

                // Validate that we have the required data
                if (!token || !user) {
                    throw new Error('Missing token or user data in response');
                }

                // Store token and user data in AsyncStorage
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                await AsyncStorage.setItem('userId', user._id);

                return { token, user };
            } else {
                console.log('Unexpected API response structure:', responseData);
                throw new Error('Invalid response structure from server');
            }
        } catch (error: any) {
            console.warn('Login error details (handled):', error?.message || error);
            return rejectWithValue(error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData: { name: string; email: string; password: string; phone?: string; role?: string; pushToken?: string | null }, { rejectWithValue }) => {
        try {
            const payload = { ...userData, role: userData.role || 'buyer' } as any;
            const response = await apiService.auth.register(payload);

            if (!response.success) {
                throw new Error(response.error || 'Registration failed');
            }

            // Handle your backend's response structure
            const responseData = response.data;

            // Your backend returns the user data directly with token field
            if (responseData.token) {
                const token = responseData.token;
                // Extract user data from the response (everything except token)
                const { token: _, ...userData } = responseData;
                const user = userData;

                // Validate that we have the required data
                if (!token || !user) {
                    throw new Error('Missing token or user data in response');
                }

                // Store token and user data in AsyncStorage
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                await AsyncStorage.setItem('userId', user._id);

                return { token, user };
            } else {
                console.log('Unexpected API response structure:', responseData);
                throw new Error('Invalid response structure from server');
            }
        } catch (error: any) {
            console.error('Registration error details:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const googleLoginUser = createAsyncThunk(
    'auth/googleLoginUser',
    async ({ firebaseToken, pushToken }: { firebaseToken: string; pushToken?: string | null }, { rejectWithValue }) => {
        try {
            console.log('Starting Google login process with Redux...');

            const response = await fetch('https://3d488f18f175.ngrok-free.app/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: firebaseToken, pushToken }),
            });

            // Try to parse JSON, but handle non-JSON responses gracefully
            let bodyText = null;
            let bodyJson = null;
            try {
                bodyText = await response.text();
                bodyJson = bodyText ? JSON.parse(bodyText) : null;
            } catch (parseErr) {
                console.warn('Failed to parse JSON from /api/auth/google response:', String(parseErr));
                console.log('Raw response text:', bodyText);
            }

            if (!response.ok) {
                const message = (bodyJson && bodyJson.message) || bodyText || `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            const { token: appToken, user } = bodyJson || {};

            if (!appToken || !user) {
                throw new Error('Missing token or user data in Google login response');
            }

            // Save token and user data in AsyncStorage
            await AsyncStorage.setItem('token', appToken);
            await AsyncStorage.setItem('user', JSON.stringify(user));
            await AsyncStorage.setItem('userId', user._id);

            console.log('Google login successful. Token and user data saved.');
            console.log('User Data:', user);
            console.log('App Token:', appToken);

            return { token: appToken, user };
        } catch (error: any) {
            console.error('Google login error details:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            return true;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const loadStoredAuth = createAsyncThunk(
    'auth/loadStoredAuth',
    async (_, { rejectWithValue }) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userString = await AsyncStorage.getItem('user');

            if (token && userString) {
                const user = JSON.parse(userString);
                return { token, user };
            }

            return null;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProfile = createAsyncThunk(
    'auth/fetchUserProfile',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { auth: AuthState };
            const token = state.auth.token;

            if (!token) {
                throw new Error('No authentication token found');
            }

            // If we already have user data in Redux, use it instead of making API call
            if (state.auth.user) {
                console.log('Using existing user data from Redux state');
                return state.auth.user;
            }

            // Make API call to get current user profile
            const response = await apiService.user.getProfile();

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch profile');
            }

            // Update AsyncStorage with fresh data
            await AsyncStorage.setItem('user', JSON.stringify(response.data));

            return response.data;
        } catch (error: any) {
            console.error('fetchUserProfile error:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateUserProfile',
    async (profileData: Partial<User>, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { auth: AuthState };
            const token = state.auth.token;

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Make API call to update profile
            const response = await apiService.user.updateProfile(profileData);

            if (!response.success) {
                throw new Error(response.error || 'Profile update failed');
            }

            // Update AsyncStorage with the complete user data from response
            if (response.data) {
                await AsyncStorage.setItem('user', JSON.stringify(response.data));
                return response.data as any; // Return the complete user data
            }

            return profileData as any;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user as any;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Register
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user as any;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Google Login
            .addCase(googleLoginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(googleLoginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(googleLoginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.error = null;
            })
            // Load stored auth
            .addCase(loadStoredAuth.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loadStoredAuth.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload) {
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                    state.isAuthenticated = true;
                } else {
                    state.isAuthenticated = false;
                }
                state.error = null;
            })
            .addCase(loadStoredAuth.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.error = action.payload as string;
            })
            // Fetch user profile
            .addCase(fetchUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update user profile
            .addCase(updateUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload; // Replace with complete user data
                state.error = null;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
