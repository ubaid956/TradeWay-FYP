import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

// API Configuration
// Centralized API URL management for the TradeWay app

export interface ApiConfig {
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
}

// Environment detection
const getEnvironment = (): 'development' | 'staging' | 'production' => {
    // You can customize this logic based on your needs
    if (__DEV__) {
        return 'development';
    }

    // Add your environment detection logic here
    // For example, you could check for specific build configurations
    return 'production';
};

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

const extractHost = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const withoutProtocol = value.includes('://') ? value.split('://')[1] : value;
    const hostWithOptionalPort = withoutProtocol.split('/')[0];
    return hostWithOptionalPort.split(':')[0];
};

const getDevServerHost = (): string | null => {
    if (!__DEV__) {
        return null;
    }

    const manifestHost = extractHost(
        (Constants as any)?.expoConfig?.hostUri ||
            (Constants as any)?.manifest?.hostUri ||
            (Constants as any)?.manifest?.debuggerHost ||
            (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
            Constants.experienceUrl
    );
    if (manifestHost) {
        return manifestHost;
    }

    const scriptHost = extractHost(NativeModules?.SourceCode?.scriptURL);
    if (scriptHost) {
        return scriptHost;
    }

    return (
        Platform.select({
            android: '10.0.2.2',
            ios: '127.0.0.1',
            default: 'localhost',
        }) || 'localhost'
    );
};

const inferredDevHost = getDevServerHost();
const inferredDevBaseUrl = inferredDevHost ? `http://${inferredDevHost}:5000/api` : 'http://localhost:5000/api';

// API URLs for different environments
const API_URLS = {
    development: envBaseUrl || inferredDevBaseUrl,
    staging: envBaseUrl || 'https://staging-tradeway.example.com/api',
    production: envBaseUrl || 'https://api.tradeway.com/api',
};

// Local development URLs (fallback/testing)
const LOCAL_URLS = {
    development: envBaseUrl || inferredDevBaseUrl,
    staging: envBaseUrl || 'http://localhost:5001/api',
    production: envBaseUrl || 'http://localhost:5002/api',
};

// Get current environment
const currentEnv = getEnvironment();

// Configuration object
export const apiConfig: ApiConfig = {
    baseURL: API_URLS[currentEnv],
    timeout: 10000, // 10 seconds
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
};

// Alternative: Use local URLs for development
export const localApiConfig: ApiConfig = {
    baseURL: LOCAL_URLS[currentEnv],
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
};

// Export the active configuration
// Change this to 'localApiConfig' if you want to use local URLs
export const activeApiConfig = apiConfig;

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        GOOGLE: '/auth/google',
        FORGOT_PASSWORD: '/auth/users/forgot',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_EMAIL: '/auth/verify-email',
    },

    // User Management
    USER: {
        PROFILE: '/auth/users/profile',
        UPDATE_PROFILE: '/auth/users/profile',
        UPLOAD_IMAGE: '/auth/users/profile/image',
        CHANGE_PASSWORD: '/auth/users/updatePassword',
        DELETE_ACCOUNT: '/auth/users/delete',
    },

    // Products
    PRODUCTS: {
        LIST: '/products',
        CREATE: '/products',
        UPDATE: '/products',
        DELETE: '/products',
        BY_ID: '/products',
        BY_USER: '/products/user',
        SELLER_PRODUCTS: '/products/seller/my-products',
        SEARCH: '/products/search',
        CATEGORIES: '/products/categories',
        TAXONOMY: '/products/taxonomy',
    },

    // Messages/Chat
    MESSAGES: {
        CHATS: '/messages/chats',
        MESSAGES: '/messages',
        SEND: '/messages',
        MARK_READ: '/messages/read',
        CREATE_CHAT: '/messages/chat',
    },

    // Orders
    ORDERS: {
        LIST: '/orders',
        CREATE: '/orders',
        UPDATE: '/orders',
        DELETE: '/orders',
        BY_ID: '/orders',
        BY_USER: '/orders/user',
        SELLER: '/orders/seller',
        BUYER: '/orders/buyer',
    },

    // Bids/Proposals
    BIDS: {
        ROOT: '/bids',
        LIST: '/bids',
        CREATE: '/bids',
        UPDATE: '/bids',
        DELETE: '/bids',
        BY_PRODUCT: '/bids/product',
        BY_USER: '/bids/user',
        MY_BIDS: '/bids/my-bids',
        VENDOR_PROPOSALS: '/bids/vendor/proposals',
        ACCEPT: '/bids',
        REJECT: '/bids',
        WITHDRAW: '/bids',
        COUNTER: '/bids',
        STATS: '/bids/stats',
    },

    // Recommendations
    RECOMMENDATIONS: {
        USER: '/recommendations',
    },

    // AI Grading
    GRADING: {
        MARBLE: '/grading/marble',
    },

    // KYC
    KYC: {
        SUBMIT: '/kyc/submit',
        STATUS: '/kyc/status',
        DOCUMENTS: '/kyc/documents',
    },

    // Requirements
    REQUIREMENTS: {
        LIST: '/requirements',
        CREATE: '/requirements',
        UPDATE: '/requirements',
        DELETE: '/requirements',
        BY_USER: '/requirements/user',
    },

    // Groups
    GROUPS: {
        LIST: '/groups',
        CREATE: '/groups',
        UPDATE: '/groups',
        DELETE: '/groups',
        JOIN: '/groups/join',
        LEAVE: '/groups/leave',
    },

    // Jobs
    JOBS: {
        ROOT: '/jobs',
        LIST: '/jobs',
        CREATE: '/jobs',
        UPDATE: '/jobs',
        DELETE: '/jobs',
        BY_USER: '/jobs/user',
        APPLY: '/jobs/apply',
        VENDOR: '/jobs/vendor',
        DRIVER: '/jobs/driver',
        DETAIL: '/jobs',
        ASSIGN: '/jobs',
        STATUS: '/jobs',
    },
    // Payments
    PAYMENTS: {
        CREATE_INTENT: '/payments/create-payment-intent',
        PUBLISHABLE_KEY: '/payments/publishable-key',
        // webhook is handled server-side
    },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
    return `${activeApiConfig.baseURL}${endpoint}`;
};

// Helper function to get headers with authentication
export const getAuthHeaders = (token?: string): Record<string, string> => {
    const headers = { ...activeApiConfig.headers };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

// Helper function to get headers for file upload
export const getUploadHeaders = (token?: string): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

// Export current environment for debugging
export const currentEnvironment = currentEnv;

// Export API base URL for easy access
export const API_BASE_URL = activeApiConfig.baseURL;
