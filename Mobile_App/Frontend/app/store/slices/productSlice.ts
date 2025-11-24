import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/apiService';

export interface Product {
    _id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    tags: string[];
    images: string[];
    location: string;
    quantity: number;
    unit: string;
    isActive: boolean;
    isSold: boolean;
    availability: {
        isAvailable: boolean;
        availableQuantity: number;
        minimumOrder: number;
    };
    shipping: {
        isShippingAvailable: boolean;
    };
    seller: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    createdAt: string;
    updatedAt: string;
    __v: number;
}

interface ProductState {
    products: Product[];
    currentProduct: Product | null;
    userProducts: Product[];
    isLoading: boolean;
    error: string | null;
    isCreating: boolean;
    isUpdating: boolean;
    pagination: {
        currentPage: number;
        totalPages: number;
        totalProducts: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    filters: {
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        location?: string;
        condition?: string;
    };
}

const initialState: ProductState = {
    products: [],
    currentProduct: null,
    userProducts: [],
    isLoading: false,
    error: null,
    isCreating: false,
    isUpdating: false,
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0,
        hasNext: false,
        hasPrev: false,
    },
    filters: {},
};

// Async thunks for product operations
export const fetchProducts = createAsyncThunk(
    'product/fetchProducts',
    async (filters: any = {}, { rejectWithValue }) => {
        try {
            const response = await apiService.products.getProducts(filters);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch products');
            }

            // Return both products and pagination data
            return {
                products: response.data.data || response.data,
                pagination: response.data.pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    totalProducts: 0,
                    hasNext: false,
                    hasPrev: false,
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchProductById = createAsyncThunk(
    'product/fetchProductById',
    async (productId: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { auth: any };
            const token = state.auth.token;

            const response = await apiService.products.getProductById(productId, token);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch product');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserProducts = createAsyncThunk(
    'product/fetchUserProducts',
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await apiService.products.getUserProducts(userId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch user products');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchSellerProducts = createAsyncThunk(
    'product/fetchSellerProducts',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState() as { auth: any };
            const token = state.auth.token;

            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await apiService.products.getSellerProducts(token);

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch seller products');
            }

            return {
                products: response.data,
                pagination: response.pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    totalProducts: response.data.length,
                    hasNext: false,
                    hasPrev: false
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createProduct = createAsyncThunk(
    'product/createProduct',
    async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'sellerName'>, { rejectWithValue }) => {
        try {
            const response = await apiService.products.createProduct(productData);

            if (!response.success) {
                throw new Error(response.error || 'Failed to create product');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateProduct = createAsyncThunk(
    'product/updateProduct',
    async ({ productId, productData }: { productId: string; productData: Partial<Product> }, { rejectWithValue }) => {
        try {
            const response = await apiService.products.updateProduct(productId, productData);

            if (!response.success) {
                throw new Error(response.error || 'Failed to update product');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteProduct = createAsyncThunk(
    'product/deleteProduct',
    async (productId: string, { rejectWithValue }) => {
        try {
            const response = await apiService.products.deleteProduct(productId);

            if (!response.success) {
                throw new Error(response.error || 'Failed to delete product');
            }

            return productId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const productSlice = createSlice({
    name: 'product',
    initialState,
    reducers: {
        clearProductError: (state) => {
            state.error = null;
        },
        setFilters: (state, action: PayloadAction<Partial<ProductState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = {};
        },
        setCurrentProduct: (state, action: PayloadAction<Product | null>) => {
            state.currentProduct = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch products
            .addCase(fetchProducts.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.products = action.payload.products;
                state.pagination = action.payload.pagination;
                state.error = null;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch product by ID
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.currentProduct = action.payload;
            })
            // Fetch user products
            .addCase(fetchUserProducts.fulfilled, (state, action) => {
                state.userProducts = action.payload;
            })
            // Fetch seller products
            .addCase(fetchSellerProducts.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchSellerProducts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userProducts = action.payload.products;
                state.pagination = action.payload.pagination;
                state.error = null;
            })
            .addCase(fetchSellerProducts.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Create product
            .addCase(createProduct.pending, (state) => {
                state.isCreating = true;
                state.error = null;
            })
            .addCase(createProduct.fulfilled, (state, action) => {
                state.isCreating = false;
                state.userProducts.push(action.payload);
                state.error = null;
            })
            .addCase(createProduct.rejected, (state, action) => {
                state.isCreating = false;
                state.error = action.payload as string;
            })
            // Update product
            .addCase(updateProduct.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(updateProduct.fulfilled, (state, action) => {
                state.isUpdating = false;
                const index = state.userProducts.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.userProducts[index] = action.payload;
                }
                if (state.currentProduct?.id === action.payload.id) {
                    state.currentProduct = action.payload;
                }
                state.error = null;
            })
            .addCase(updateProduct.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload as string;
            })
            // Delete product
            .addCase(deleteProduct.fulfilled, (state, action) => {
                state.userProducts = state.userProducts.filter(p => p.id !== action.payload);
                if (state.currentProduct?.id === action.payload) {
                    state.currentProduct = null;
                }
            });
    },
});

export const { clearProductError, setFilters, clearFilters, setCurrentProduct } = productSlice.actions;
export default productSlice.reducer;
