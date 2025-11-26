
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { loadStoredAuth } from '@/src/store/slices/authSlice';
import { StripeProvider } from '@stripe/stripe-react-native';
import apiService from '@/src/services/apiService';

// We'll fetch the publishable key from the server at runtime instead of hard-coding it

// Context to share Stripe readiness state
const StripeReadyContext = createContext<boolean>(false);
export const useStripeReady = () => useContext(StripeReadyContext);

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Load stored authentication on app start
    dispatch(loadStoredAuth());
  }, [dispatch]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const fetchKey = async () => {
      try {
        const resp = await apiService.payments.getPublishableKey();
        if (resp.success && resp.data) {
          if (mounted) setPublishableKey(resp.data.publishableKey || null);
        } else {
          console.warn('Failed to fetch publishable key:', resp.error || resp.message);
        }
      } catch (err) {
        console.warn('Error fetching publishable key:', err);
      } finally {
        if (mounted) setLoadingKey(false);
      }
    };

    fetchKey();

    return () => {
      mounted = false;
    };
  }, []);

  // Always wrap with StripeProvider, but use a fallback key until the real one loads.
  // This prevents crashes when PaymentSheet is accessed before key is fetched.
  const effectiveKey = publishableKey || 'pk_test_placeholder';
  const stripeReady = !loadingKey && !!publishableKey;

  return (
    <Provider store={store}>
      <StripeReadyContext.Provider value={stripeReady}>
        <StripeProvider
          publishableKey={effectiveKey}
          merchantIdentifier={"merchant.YOUR_MERCHANT_ID"} // replace with your Apple Merchant ID
          urlScheme={"frontend"} // must match the scheme in app.json (used for 3DS/bank redirects)
        >
          <AppContent />
        </StripeProvider>
      </StripeReadyContext.Provider>
    </Provider>
  );
}
