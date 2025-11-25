
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens();

import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '@/src/store';
import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/src/store/hooks';
import { loadStoredAuth } from '@/src/store/slices/authSlice';
import { StripeProvider } from '@stripe/stripe-react-native';
import apiService from '@/src/services/apiService';

// We'll fetch the publishable key from the server at runtime instead of hard-coding it

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

  // While fetching the publishable key, render the app (without StripeProvider).
  // Once the key is available, wrap the app with StripeProvider. If the key is missing,
  // the app will continue to render but Stripe flows will not initialize.
  if (loadingKey) {
    return (
      <Provider store={store}>
        <AppContent />
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      {publishableKey ? (
        <StripeProvider
          publishableKey={publishableKey}
          merchantIdentifier={"merchant.YOUR_MERCHANT_ID"} // replace with your Apple Merchant ID
          urlScheme={"frontend"} // must match the scheme in app.json (used for 3DS/bank redirects)
        >
          <AppContent />
        </StripeProvider>
      ) : (
        // No publishable key returned — render app but Stripe won't be initialized.
        <AppContent />
      )}
    </Provider>
  );
}
