import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { recommendationsApi, RecommendationItem, RecommendationResponse } from '../../services/apiService';

export interface RecommendationState {
    items: RecommendationItem[];
    isLoading: boolean;
    error: string | null;
    lastFetched: string | null;
}

const initialState: RecommendationState = {
    items: [],
    isLoading: false,
    error: null,
    lastFetched: null,
};

export const fetchRecommendations = createAsyncThunk(
    'recommendations/fetchRecommendations',
    async (limit: number | undefined, { rejectWithValue }) => {
        try {
            const response = await recommendationsApi.getUserRecommendations(limit ?? 5);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Unable to fetch recommendations');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Unable to fetch recommendations');
        }
    }
);

const recommendationSlice = createSlice({
    name: 'recommendations',
    initialState,
    reducers: {
        clearRecommendations: (state) => {
            state.items = [];
            state.error = null;
            state.lastFetched = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchRecommendations.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchRecommendations.fulfilled, (state, action: PayloadAction<RecommendationResponse>) => {
                state.isLoading = false;
                state.items = action.payload?.data || [];
                state.lastFetched = new Date().toISOString();
            })
            .addCase(fetchRecommendations.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearRecommendations } = recommendationSlice.actions;
export default recommendationSlice.reducer;
