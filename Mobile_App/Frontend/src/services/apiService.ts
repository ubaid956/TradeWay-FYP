// API Service Layer
// Centralized API service for making HTTP requests

import { activeApiConfig, buildApiUrl, getAuthHeaders, getUploadHeaders, API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for API responses
export interface ApiResponse<T = any> {
    success: boolean;
    data: T | null;
    message?: string;
    error?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role: string;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface DriverKycPayload {
    cnicNumber?: string;
    licenseNumber?: string;
    truckRegistrationNumber?: string;
    licenseExpiry?: string;
    truckType?: string;
    yearsOfExperience?: string | number;
    additionalNotes?: string;
    cnicFrontImage?: string;
    cnicBackImage?: string;
    licensePhoto?: string;
    truckPhoto?: string;
}

export interface RequirementQuantity {
    amount: number;
    unit: string;
}

export interface RequirementLocation {
    city: string;
    address?: string;
}

export interface RequirementBudget {
    amount: number;
    currency: string;
}

export interface Requirement {
    _id: string;
    title: string;
    productType: string;
    gradePreference?: string;
    quantity: RequirementQuantity;
    location: RequirementLocation;
    budget: RequirementBudget;
    description?: string;
    needByDate?: string;
    contactPreference?: 'chat' | 'phone' | 'email' | 'any';
    status: 'open' | 'in_progress' | 'fulfilled' | 'cancelled' | 'expired';
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CounterOfferPayload {
    bidAmount?: number;
    quantity?: number;
    message?: string;
}

export interface JobLocationPayload {
    label?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    instructions?: string;
}

export interface JobContactPayload {
    name?: string;
    phone?: string;
    notes?: string;
}

export interface CargoDetailsPayload {
    weight?: number;
    unit?: string;
    dimensions?: string;
    cargoType?: string;
    notes?: string;
}

export interface CreateJobPayload {
    orderId?: string;
    productId?: string;
    buyerId?: string;
    origin?: JobLocationPayload;
    destination?: JobLocationPayload;
    pickupContact?: JobContactPayload;
    deliveryContact?: JobContactPayload;
    cargoDetails?: CargoDetailsPayload;
    price?: number;
    notes?: string;
}

export interface JobStatusUpdatePayload {
    status: 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
    notes?: string;
}

export interface RequirementPayload {
    title: string;
    productType: string;
    gradePreference?: string;
    quantityAmount: number;
    quantityUnit?: string;
    locationCity: string;
    locationAddress?: string;
    budgetAmount: number;
    budgetCurrency?: string;
    description?: string;
    needByDate?: string;
    contactPreference?: 'chat' | 'phone' | 'email' | 'any';
    tags?: string[] | string;
}

export interface RequirementFilters {
    status?: string;
    productType?: string;
    city?: string;
    search?: string;
    minBudget?: number;
    maxBudget?: number;
    page?: number;
    limit?: number;
    sort?: string;
}

// Generic API request function
const apiRequest = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> => {
    try {
        const url = buildApiUrl(endpoint);

        const defaultOptions: RequestInit = {
            method: 'GET',
            headers: activeApiConfig.headers,
            ...options,
        };

        const response = await fetch(url, defaultOptions);

        // Handle different response types
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            success: true,
            data,
        };
    } catch (error: any) {
        console.error('API Request Error:', error);
        return {
            success: false,
            data: null,
            error: error.message || 'An unexpected error occurred',
        };
    }
};

// Authenticated API request function
const authenticatedRequest = async <T = any>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
): Promise<ApiResponse<T>> => {
    try {
        // If token is not provided, try to get it from AsyncStorage as fallback
        let authToken = token;
        if (!authToken) {
            const stored = await AsyncStorage.getItem('token');
            if (stored) authToken = stored;
        }

        if (!authToken) {
            throw new Error('No authentication token found');
        }

        const url = buildApiUrl(endpoint);
        const headers = getAuthHeaders(authToken!);

        const defaultOptions: RequestInit = {
            method: 'GET',
            headers,
            ...options,
        };

        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            success: true,
            data,
        };
    } catch (error: any) {
        console.error('Authenticated API Request Error:', error);
        return {
            success: false,
            data: null,
            error: error.message || 'An unexpected error occurred',
        };
    }
};

// Authentication API calls
export const authApi = {
    // Login user
    login: async (credentials: LoginRequest): Promise<ApiResponse<any>> => {
        try {
            const url = buildApiUrl(API_ENDPOINTS.AUTH.LOGIN);
            const response = await fetch(url, {
                method: 'POST',
                headers: activeApiConfig.headers,
                body: JSON.stringify(credentials),
            });

            const bodyText = await response.text();
            let parsedBody: any = null;
            try {
                parsedBody = bodyText ? JSON.parse(bodyText) : null;
            } catch (parseError) {
                console.warn('API Service: Failed to parse login response JSON. Raw body preserved.');
            }

            if (!response.ok) {
                const errorMessage = parsedBody?.message || bodyText || `HTTP ${response.status}: ${response.statusText}`;
                return {
                    success: false,
                    data: null,
                    error: errorMessage,
                };
            }

            console.log('API Service: Login response:', parsedBody);
            return {
                success: true,
                data: parsedBody,
            };
        } catch (error: any) {
            console.warn('API Service: Network/Unexpected login error:', error?.message || error);
            return {
                success: false,
                data: null,
                error: error?.message || 'An unexpected error occurred',
            };
        }
    },

    // Register user
    register: async (userData: RegisterRequest): Promise<ApiResponse<any>> => {
        console.log('API Service: Making register request to:', buildApiUrl(API_ENDPOINTS.AUTH.REGISTER));
        console.log('API Service: Register data:', userData);

        try {
            const url = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER);
            const response = await fetch(url, {
                method: 'POST',
                headers: activeApiConfig.headers,
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API Service: Register response:', data);

            return {
                success: true,
                data: data,
            };
        } catch (error: any) {
            console.error('API Request Error:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'An unexpected error occurred',
            };
        }
    },

    // Google authentication
    googleAuth: async (token: string): Promise<ApiResponse<AuthResponse>> => {
        return apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },

    // Logout user
    logout: async (): Promise<ApiResponse<void>> => {
        return authenticatedRequest<void>(API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
        });
    },

    // Forgot password
    forgotPassword: async (email: string): Promise<ApiResponse<void>> => {
        return apiRequest<void>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    // Reset password
    resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<void>> => {
        return apiRequest<void>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    },

    // Verify email
    verifyEmail: async (token: string): Promise<ApiResponse<void>> => {
        return apiRequest<void>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, {
            method: 'POST',
            body: JSON.stringify({ token }),
        });
    },
};

// User API calls
export const userApi = {
    // Get user profile
    getProfile: async (): Promise<ApiResponse<User>> => {
        return authenticatedRequest<User>(API_ENDPOINTS.USER.PROFILE);
    },

    // Update user profile
    updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
        return authenticatedRequest<User>(API_ENDPOINTS.USER.UPDATE_PROFILE, {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    },

    // Upload profile image (handled through updateProfile endpoint)
    uploadProfileImage: async (imageUri: string): Promise<ApiResponse<User>> => {
        const formData = new FormData();
        formData.append('profilePic', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'profile.jpg',
        } as any);

        const token = await AsyncStorage.getItem('token');
        const headers = getUploadHeaders(token || undefined);

        return apiRequest<User>(API_ENDPOINTS.USER.UPDATE_PROFILE, {
            method: 'PUT',
            headers,
            body: formData,
        });
    },

    // Change password
    changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
        return authenticatedRequest<void>(API_ENDPOINTS.USER.CHANGE_PASSWORD, {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    },
};

// Products API calls
export const productsApi = {
    // Get all products
    getProducts: async (filters?: any): Promise<ApiResponse<any[]>> => {
        const queryParams = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, value.toString());
                }
            });
        }

        const endpoint = queryParams.toString()
            ? `${API_ENDPOINTS.PRODUCTS.LIST}?${queryParams}`
            : API_ENDPOINTS.PRODUCTS.LIST;

        return apiRequest<any[]>(endpoint);
    },

    // Get product by ID - with optional token parameter for Redux integration
    getProductById: async (productId: string, token?: string): Promise<ApiResponse<any>> => {
        // If token is provided (from Redux), use authenticated request
        if (token) {
            return authenticatedRequest<any>(`${API_ENDPOINTS.PRODUCTS.BY_ID}/${productId}`, {}, token);
        }

        // Try to get token from AsyncStorage as fallback
        try {
            const storedToken = await AsyncStorage.getItem('token');
            if (storedToken) {
                return authenticatedRequest<any>(`${API_ENDPOINTS.PRODUCTS.BY_ID}/${productId}`, {}, storedToken);
            }
        } catch (err) {
            console.log('No token found, using public request:', err);
        }

        // Fallback to public request
        return apiRequest<any>(`${API_ENDPOINTS.PRODUCTS.BY_ID}/${productId}`);
    },

    // Get user's products
    getUserProducts: async (userId: string): Promise<ApiResponse<any[]>> => {
        return authenticatedRequest<any[]>(`${API_ENDPOINTS.PRODUCTS.BY_USER}/${userId}`);
    },

    // Get seller's products (my products)
    getSellerProducts: async (token?: string): Promise<ApiResponse<any[]>> => {
        if (token) {
            // Use provided token
            const url = buildApiUrl(API_ENDPOINTS.PRODUCTS.SELLER_PRODUCTS);
            const headers = getAuthHeaders(token);

            const response = await fetch(url, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } else {
            // Fallback to authenticatedRequest
            return authenticatedRequest<any[]>(API_ENDPOINTS.PRODUCTS.SELLER_PRODUCTS);
        }
    },

    // Create product
    createProduct: async (productData: any): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.PRODUCTS.CREATE, {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    },

    // Create product with images
    createProductWithImages: async (productData: any, images: string[]): Promise<ApiResponse<any>> => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const url = buildApiUrl(API_ENDPOINTS.PRODUCTS.CREATE);
            const formData = new FormData();

            // Add product data fields
            Object.keys(productData).forEach(key => {
                if (key !== 'images') {
                    if (typeof productData[key] === 'object') {
                        formData.append(key, JSON.stringify(productData[key]));
                    } else {
                        formData.append(key, productData[key].toString());
                    }
                }
            });

            // Add images
            images.forEach((imageUri, index) => {
                formData.append('images', {
                    uri: imageUri,
                    type: 'image/jpeg',
                    name: `product_image_${index}.jpg`,
                } as any);
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error('Create product with images error:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'An unexpected error occurred',
            };
        }
    },

    // Update product
    updateProduct: async (productId: string, productData: any): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.PRODUCTS.UPDATE}/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    },

    getCategories: async (): Promise<ApiResponse<any>> => {
        return apiRequest<any>(API_ENDPOINTS.PRODUCTS.CATEGORIES);
    },

    getTaxonomy: async (): Promise<ApiResponse<any>> => {
        return apiRequest<any>(API_ENDPOINTS.PRODUCTS.TAXONOMY);
    },

    // Delete product
    deleteProduct: async (productId: string): Promise<ApiResponse<void>> => {
        return authenticatedRequest<void>(`${API_ENDPOINTS.PRODUCTS.DELETE}/${productId}`, {
            method: 'DELETE',
        });
    },
};

const DRIVER_FILE_FIELDS = ['cnicFrontImage', 'cnicBackImage', 'licensePhoto', 'truckPhoto'];

export const kycApi = {
    getStatus: async (): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.KYC.STATUS);
    },
    getDocuments: async (): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.KYC.DOCUMENTS);
    },
    submitDriverKyc: async (payload: DriverKycPayload): Promise<ApiResponse<any>> => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const url = buildApiUrl(API_ENDPOINTS.KYC.SUBMIT);
            const formData = new FormData();

            Object.entries(payload).forEach(([key, value]) => {
                if (value === undefined || value === null || value === '') {
                    return;
                }

                if (DRIVER_FILE_FIELDS.includes(key)) {
                    formData.append(key, {
                        uri: value as string,
                        type: 'image/jpeg',
                        name: `${key}.jpg`,
                    } as any);
                } else {
                    formData.append(key, value.toString());
                }
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error('Driver KYC submission error:', error);
            return {
                success: false,
                data: null,
                error: error.message || 'An unexpected error occurred',
            };
        }
    },
};

// Messages API calls
export const messagesApi = {
    // Get user's chats
    getChats: async (userId: string): Promise<ApiResponse<any[]>> => {
        return authenticatedRequest<any[]>(`${API_ENDPOINTS.MESSAGES.CHATS}/${userId}`);
    },

    // Get messages for a chat
    getMessages: async (chatId: string, page = 1, limit = 50): Promise<ApiResponse<any[]>> => {
        return authenticatedRequest<any[]>(`${API_ENDPOINTS.MESSAGES.MESSAGES}/${chatId}?page=${page}&limit=${limit}`);
    },

    // Send message
    sendMessage: async (chatId: string, content: string, type = 'text', attachments?: string[]): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.MESSAGES.SEND}/${chatId}`, {
            method: 'POST',
            body: JSON.stringify({ content, type, attachments }),
        });
    },

    // Create chat
    createChat: async (participantIds: string[]): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.MESSAGES.CREATE_CHAT, {
            method: 'POST',
            body: JSON.stringify({ participantIds }),
        });
    },

    // Mark messages as read
    markMessagesAsRead: async (chatId: string, messageIds: string[]): Promise<ApiResponse<void>> => {
        return authenticatedRequest<void>(`${API_ENDPOINTS.MESSAGES.MARK_READ}/${chatId}`, {
            method: 'PUT',
            body: JSON.stringify({ messageIds }),
        });
    },
};

// Bids/Proposals API calls
export const bidsApi = {
    // Create a new bid/proposal
    createBid: async (bidData: { productId: string; bidAmount: number; quantity: number; message?: string }): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.BIDS.CREATE, {
            method: 'POST',
            body: JSON.stringify(bidData),
        });
    },
    // Get vendor's proposals (all products)
    getVendorProposals: async (status?: string, page = 1, limit = 20): Promise<ApiResponse<any>> => {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        if (status) queryParams.append('status', status);
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.VENDOR_PROPOSALS}?${queryParams}`);
    },
    // Get buyer's own bids
    getMyBids: async (status?: string, page = 1, limit = 20): Promise<ApiResponse<any>> => {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        if (status) queryParams.append('status', status);
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.MY_BIDS}?${queryParams}`);
    },
    // Get bids for a specific product
    getBidsForProduct: async (productId: string, status?: string): Promise<ApiResponse<any>> => {
        const queryParams = status ? `?status=${status}` : '';
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.BY_PRODUCT}/${productId}${queryParams}`);
    },
    // Accept a proposal
    acceptBid: async (bidId: string, message?: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.ACCEPT}/${bidId}/accept`, {
            method: 'PATCH',
            body: JSON.stringify({ message }),
        });
    },
    // Reject a proposal
    rejectBid: async (bidId: string, message?: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.REJECT}/${bidId}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ message }),
        });
    },
    // Withdraw a bid (buyer action)
    withdrawBid: async (bidId: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.WITHDRAW}/${bidId}/withdraw`, {
            method: 'PATCH',
        });
    },
    // Counter offer (buyer or vendor depending on awaitingAction)
    counterOffer: async (bidId: string, payload: CounterOfferPayload): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.COUNTER}/${bidId}/counter`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    // Update a pending bid
    updateBid: async (
        bidId: string,
        payload: { bidAmount?: number; quantity?: number; message?: string }
    ): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.BIDS.UPDATE}/${bidId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
    // Get bid statistics
    getBidStats: async (): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.BIDS.STATS);
    },
};

export const requirementsApi = {
    getRequirements: async (filters: RequirementFilters = {}): Promise<ApiResponse<any>> => {
        const query = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }
            query.append(key, value.toString());
        });

        const queryString = query.toString();
        const endpoint = queryString
            ? `${API_ENDPOINTS.REQUIREMENTS.LIST}?${queryString}`
            : API_ENDPOINTS.REQUIREMENTS.LIST;

        return authenticatedRequest<any>(endpoint);
    },

    getMyRequirements: async (status?: string): Promise<ApiResponse<any>> => {
        const query = status ? `?status=${status}` : '';
        return authenticatedRequest<any>(`${API_ENDPOINTS.REQUIREMENTS.BY_USER}${query}`);
    },

    createRequirement: async (payload: RequirementPayload): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.REQUIREMENTS.CREATE, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    updateRequirement: async (
        requirementId: string,
        payload: Partial<RequirementPayload> & { status?: Requirement['status'] }
    ): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.REQUIREMENTS.UPDATE}/${requirementId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deleteRequirement: async (requirementId: string): Promise<ApiResponse<void>> => {
        return authenticatedRequest<void>(`${API_ENDPOINTS.REQUIREMENTS.DELETE}/${requirementId}`, {
            method: 'DELETE',
        });
    },
};

// Orders API calls
export const ordersApi = {
    getSellerOrders: async (status?: string, page = 1, limit = 20): Promise<ApiResponse<any>> => {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        if (status) queryParams.append('status', status);
        return authenticatedRequest<any>(`${API_ENDPOINTS.ORDERS.SELLER}?${queryParams}`);
    },
    getOrderById: async (orderId: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.ORDERS.BY_ID}/${orderId}`);
    },
    getBuyerOrders: async (status?: string, page = 1, limit = 20): Promise<ApiResponse<any>> => {
        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        if (status) queryParams.append('status', status);
        return authenticatedRequest<any>(`${API_ENDPOINTS.ORDERS.BUYER}?${queryParams}`);
    },
};

// Payments API
export const paymentsApi = {
    createPaymentIntent: async (orderId: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.PAYMENTS.CREATE_INTENT, {
            method: 'POST',
            body: JSON.stringify({ orderId }),
        });
    },
    getPublishableKey: async (): Promise<ApiResponse<{ publishableKey: string | null }>> => {
        // Publishable key is safe to fetch without auth; use apiRequest instead of authenticatedRequest
        return apiRequest<{ publishableKey: string | null }>(API_ENDPOINTS.PAYMENTS.PUBLISHABLE_KEY);
    },
};

// Cargo jobs API calls
export const jobsApi = {
    createJob: async (payload: CreateJobPayload): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(API_ENDPOINTS.JOBS.CREATE, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
    getVendorJobs: async (status?: string): Promise<ApiResponse<any>> => {
        const query = new URLSearchParams();
        if (status) {
            query.append('status', status);
        }
        const suffix = query.toString() ? `?${query}` : '';
        return authenticatedRequest<any>(`${API_ENDPOINTS.JOBS.VENDOR}${suffix}`);
    },
    getDriverJobs: async (includeAssigned = true): Promise<ApiResponse<any>> => {
        const query = `?includeAssigned=${includeAssigned}`;
        return authenticatedRequest<any>(`${API_ENDPOINTS.JOBS.DRIVER}${query}`);
    },
    getJobById: async (jobId: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.JOBS.DETAIL}/${jobId}`);
    },
    assignJob: async (jobId: string, notes?: string): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.JOBS.ASSIGN}/${jobId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        });
    },
    updateJobStatus: async (jobId: string, payload: JobStatusUpdatePayload): Promise<ApiResponse<any>> => {
        return authenticatedRequest<any>(`${API_ENDPOINTS.JOBS.STATUS}/${jobId}/status`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },
};

// Recommendations API calls
export interface RecommendationItem {
    productId: string;
    score: number;
    reason: string;
    product?: {
        productId: string;
        title: string;
        category: string;
        tags: string[];
        price: number;
        location: string;
        freshnessScore: number;
        isSold: boolean;
        description?: string;
        images?: string[];
        quantity?: number;
        availability?: {
            availableQuantity?: number;
            minimumOrder?: number;
        };
    };
}

export interface RecommendationResponse {
    success: boolean;
    count: number;
    data: RecommendationItem[];
}

export const recommendationsApi = {
    getUserRecommendations: async (limit = 5): Promise<ApiResponse<RecommendationResponse>> => {
        const query = `${API_ENDPOINTS.RECOMMENDATIONS.USER}?limit=${limit}`;
        return authenticatedRequest<RecommendationResponse>(query);
    },
};

export interface GradeProductOptions {
    imageUrls?: string[];
    promptContext?: string;
}

export const gradingApi = {
    gradeProduct: async (productId: string, options: GradeProductOptions = {}): Promise<ApiResponse<any>> => {
        const payload: Record<string, any> = { productId };

        if (options.imageUrls && options.imageUrls.length) {
            payload.imageUrls = options.imageUrls;
        }

        if (options.promptContext) {
            payload.promptContext = options.promptContext;
        }

        return authenticatedRequest<any>(API_ENDPOINTS.GRADING.MARBLE, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};

// Export all API services
export const apiService = {
    auth: authApi,
    user: userApi,
    products: productsApi,
    messages: messagesApi,
    kyc: kycApi,
    bids: bidsApi,
    orders: ordersApi,
    payments: paymentsApi,
    jobs: jobsApi,
    recommendations: recommendationsApi,
    requirements: requirementsApi,
    grading: gradingApi,
};

// Export default API service
export default apiService;
