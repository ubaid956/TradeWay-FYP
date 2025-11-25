import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService, Requirement, RequirementPayload } from '../../services/apiService';

interface RequirementState {
    items: Requirement[];
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    selectedRequirement: Requirement | null;
    lastFetchedAt: string | null;
}

const initialState: RequirementState = {
    items: [],
    isLoading: false,
    isSaving: false,
    error: null,
    selectedRequirement: null,
    lastFetchedAt: null,
};

const extractRequirementData = (responseData: any): Requirement[] => {
    if (!responseData) return [];

    if (Array.isArray(responseData?.data)) {
        return responseData.data;
    }

    if (Array.isArray(responseData)) {
        return responseData;
    }

    return [];
};

const extractRequirement = (responseData: any): Requirement => {
    if (!responseData) {
        throw new Error('Empty response');
    }

    if (responseData.data) {
        return responseData.data as Requirement;
    }

    return responseData as Requirement;
};

export const fetchMyRequirements = createAsyncThunk<Requirement[], string | undefined, { rejectValue: string }>(
    'requirements/fetchMyRequirements',
    async (status, { rejectWithValue }) => {
        try {
            const response = await apiService.requirements.getMyRequirements(status);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch requirements');
            }

            return extractRequirementData(response.data);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch requirements');
        }
    }
);

export const createRequirement = createAsyncThunk<Requirement, RequirementPayload, { rejectValue: string }>(
    'requirements/createRequirement',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiService.requirements.createRequirement(payload);

            if (!response.success) {
                throw new Error(response.error || 'Failed to create requirement');
            }

            return extractRequirement(response.data);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create requirement');
        }
    }
);

export const updateRequirement = createAsyncThunk<Requirement, { requirementId: string; updates: Partial<RequirementPayload> & { status?: Requirement['status'] } }, { rejectValue: string }>(
    'requirements/updateRequirement',
    async ({ requirementId, updates }, { rejectWithValue }) => {
        try {
            const response = await apiService.requirements.updateRequirement(requirementId, updates);

            if (!response.success) {
                throw new Error(response.error || 'Failed to update requirement');
            }

            return extractRequirement(response.data);
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update requirement');
        }
    }
);

export const deleteRequirement = createAsyncThunk<string, string, { rejectValue: string }>(
    'requirements/deleteRequirement',
    async (requirementId, { rejectWithValue }) => {
        try {
            const response = await apiService.requirements.deleteRequirement(requirementId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to delete requirement');
            }

            return requirementId;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete requirement');
        }
    }
);

const requirementSlice = createSlice({
    name: 'requirements',
    initialState,
    reducers: {
        setSelectedRequirement: (state, action: PayloadAction<Requirement | null>) => {
            state.selectedRequirement = action.payload;
        },
        clearRequirementError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyRequirements.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyRequirements.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload;
                state.lastFetchedAt = new Date().toISOString();
            })
            .addCase(fetchMyRequirements.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Unable to load requirements';
            })
            .addCase(createRequirement.pending, (state) => {
                state.isSaving = true;
                state.error = null;
            })
            .addCase(createRequirement.fulfilled, (state, action) => {
                state.isSaving = false;
                state.items.unshift(action.payload);
            })
            .addCase(createRequirement.rejected, (state, action) => {
                state.isSaving = false;
                state.error = action.payload || 'Unable to create requirement';
            })
            .addCase(updateRequirement.pending, (state) => {
                state.isSaving = true;
                state.error = null;
            })
            .addCase(updateRequirement.fulfilled, (state, action) => {
                state.isSaving = false;
                const idx = state.items.findIndex(item => item._id === action.payload._id);
                if (idx !== -1) {
                    state.items[idx] = action.payload;
                }
                if (state.selectedRequirement?._id === action.payload._id) {
                    state.selectedRequirement = action.payload;
                }
            })
            .addCase(updateRequirement.rejected, (state, action) => {
                state.isSaving = false;
                state.error = action.payload || 'Unable to update requirement';
            })
            .addCase(deleteRequirement.pending, (state) => {
                state.isSaving = true;
                state.error = null;
            })
            .addCase(deleteRequirement.fulfilled, (state, action) => {
                state.isSaving = false;
                state.items = state.items.filter(item => item._id !== action.payload);
                if (state.selectedRequirement?._id === action.payload) {
                    state.selectedRequirement = null;
                }
            })
            .addCase(deleteRequirement.rejected, (state, action) => {
                state.isSaving = false;
                state.error = action.payload || 'Unable to delete requirement';
            });
    },
});

export const { setSelectedRequirement, clearRequirementError } = requirementSlice.actions;
export default requirementSlice.reducer;
