import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/apiService';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    address?: string;
    city?: string;
    country?: string;
    isVerified: boolean;
    role: 'buyer' | 'seller' | 'both';
    kycStatus: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

interface UserState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
    isUpdating: boolean;
}

const initialState: UserState = {
    profile: null,
    isLoading: false,
    error: null,
    isUpdating: false,
};

// Async thunks for user operations
export const fetchUserProfile = createAsyncThunk(
    'user/fetchUserProfile',
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await apiService.user.getProfile(userId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch profile');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'user/updateUserProfile',
    async ({ userId, profileData }: { userId: string; profileData: Partial<UserProfile> }, { rejectWithValue }) => {
        try {
            const response = await apiService.user.updateProfile(userId, profileData);

            if (!response.success) {
                throw new Error(response.error || 'Failed to update profile');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const uploadProfileImage = createAsyncThunk(
    'user/uploadProfileImage',
    async ({ userId, imageUri }: { userId: string; imageUri: string }, { rejectWithValue }) => {
        try {
            const response = await apiService.user.uploadProfileImage(userId, imageUri);

            if (!response.success) {
                throw new Error(response.error || 'Failed to upload image');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUserError: (state) => {
            state.error = null;
        },
        setProfile: (state, action: PayloadAction<UserProfile>) => {
            state.profile = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch user profile
            .addCase(fetchUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.profile = action.payload;
                state.error = null;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update user profile
            .addCase(updateUserProfile.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action) => {
                state.isUpdating = false;
                state.profile = action.payload;
                state.error = null;
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload as string;
            })
            // Upload profile image
            .addCase(uploadProfileImage.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(uploadProfileImage.fulfilled, (state, action) => {
                state.isUpdating = false;
                if (state.profile) {
                    state.profile.profileImage = action.payload.profileImage;
                }
                state.error = null;
            })
            .addCase(uploadProfileImage.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearUserError, setProfile } = userSlice.actions;
export default userSlice.reducer;
