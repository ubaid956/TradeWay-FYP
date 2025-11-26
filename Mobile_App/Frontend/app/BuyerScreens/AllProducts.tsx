import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { globalStyles } from '@/Styles/globalStyles';
import CustomHeader from '../Components/Headers/CustomHeader';
import ProductCard from '../Components/HomePage/FeatureCard';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { fetchProducts } from '@/src/store/slices/productSlice';

type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  availability: number;
  grade: string | null;
  image: ImageSourcePropType;
};

const FALLBACK_IMAGE = require('../../assets/images/home/featureCard.png');
const PRODUCT_FETCH_LIMIT = 200;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = 230;

const AllProducts = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { products, isLoading, error } = useAppSelector(state => state.product);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProducts({ limit: PRODUCT_FETCH_LIMIT, page: 1 }));
    }, [dispatch])
  );

  const catalogProducts = useMemo<CatalogProduct[]>(() => {
    return products.map(product => {
      const coverImage = product.images && product.images.length > 0 ? { uri: product.images[0] } : FALLBACK_IMAGE;
      const availableQuantity = product.availability?.availableQuantity ?? product.quantity ?? 0;
      const grade = product.specifications?.grade ?? product.grading?.grade ?? null;

      return {
        id: product._id,
        title: product.title,
        description: product.description,
        price: product.price?.toString() || '0',
        location: product.location,
        availability: availableQuantity,
        grade,
        image: coverImage,
      };
    });
  }, [products]);

  const handleViewProduct = useCallback(
    (productId?: string) => {
      if (!productId) {
        console.warn('No product ID provided for navigation');
        return;
      }

      router.push(`/Product_Pages/ViewProduct?productId=${productId}`);
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchProducts({ limit: PRODUCT_FETCH_LIMIT, page: 1 })).unwrap();
    } catch (refreshError) {
      console.error('Failed to refresh products', refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleRetry = () => {
    dispatch(fetchProducts({ limit: PRODUCT_FETCH_LIMIT, page: 1 }));
  };

  const renderProduct = useCallback(({ item }: { item: CatalogProduct }) => (
    <View style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
      <ProductCard
        id={item.id}
        image={item.image}
        title={item.title}
        description={item.description}
        price={item.price}
        location={item.location}
        availability={item.availability}
        grade={item.grade}
        verified
        compact
        style={{ height: CARD_HEIGHT, marginVertical: 0 }}
        isFavorite={false}
        onToggleFavorite={() => console.log('Toggle favorite for', item.id)}
        onViewDetails={() => handleViewProduct(item.id)}
      />
    </View>
  ), [handleViewProduct]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No products yet</Text>
      <Text style={styles.emptySubtitle}>New listings will appear here once sellers add inventory.</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleRetry}>
        <Text style={styles.secondaryButtonText}>Reload</Text>
      </TouchableOpacity>
    </View>
  );

  const showInitialLoader = isLoading && !refreshing && catalogProducts.length === 0;
  const showErrorState = !isLoading && error && catalogProducts.length === 0;

  return (
    <View style={globalStyles.container}>
      <CustomHeader title="All Products" onBackPress={() => router.back()} />

      {showInitialLoader ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0758C2" />
          <Text style={styles.loadingText}>Loading catalog...</Text>
        </View>
      ) : showErrorState ? (
        <View style={styles.errorState}>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={catalogProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderProduct}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {error && catalogProducts.length > 0 && (
        <View style={styles.inlineErrorBanner}>
          <Text style={styles.inlineErrorText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={styles.retryLink}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#4B5563',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 40,
    paddingTop: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  cardWrapper: {
    marginBottom: GRID_GAP,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    borderColor: '#0758C2',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#0758C2',
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorMessage: {
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#0758C2',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inlineErrorBanner: {
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  inlineErrorText: {
    color: '#B91C1C',
    textAlign: 'center',
  },
  retryLink: {
    color: '#0758C2',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default AllProducts;
