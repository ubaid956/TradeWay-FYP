import { globalStyles } from '@/Styles/globalStyles';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, ScrollView, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProductCard from '../Components/HomePage/FeatureCard';
import FeatureText from '../Components/HomePage/FeatureText';
import HomeHeader from '../Components/HomePage/HomeHeader';
// import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAppDispatch,useAppSelector } from '@/src/store/hooks';
import Jobs from '../Driver/Jobs';
// import { fetchProducts } from '../store/slices/productSlice';
import { fetchProducts } from '@/src/store/slices/productSlice';
import { fetchRecommendations } from '@/src/store/slices/recommendationSlice';
// import { fetchRecommendations } from '../store/slices/recommendationSlice';

const { width } = Dimensions.get('window');
const RECOMMENDED_CARD_WIDTH = width * 0.6;
const GRID_CARD_WIDTH = Math.floor((width * 0.94 - 12) / 2);
const GRID_CARD_HEIGHT = 250;
const FEATURED_LIMIT = 10;

const Home = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { products, isLoading, error } = useAppSelector(state => state.product);
  const { user } = useAppSelector(state => state.auth);
  const {
    items: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useAppSelector(state => state.recommendation);

  useEffect(() => {
    dispatch(fetchProducts({}));
  }, [dispatch]);

  useEffect(() => {
    if (user?.role === 'buyer') {
      dispatch(fetchRecommendations(10));
    }
  }, [dispatch, user?.role]);

  useEffect(() => {
    if (products.length > 0) {
      console.log('Products loaded from API:', products.length);
    }
  }, [products]);

  const resolveProductGrade = useCallback((productData: (typeof products)[number] | any) => {
    const rawGrade = productData?.specifications?.grade
      ?? productData?.grading?.grade
      ?? productData?.grade
      ?? null;

    return rawGrade ? rawGrade.toString().trim().toLowerCase() : null;
  }, []);

  const transformedProducts = useMemo(() => {
    return products.map(product => {
      const imageSource = product.images && product.images.length > 0
        ? { uri: product.images[0] }
        : require('../../assets/images/home/featureCard.png');

      return {
        id: product._id,
        title: product.title,
        price: product.price.toString(),
        image: imageSource,
        isFavorite: false,
        description: product.description,
        location: product.location,
        availability: product.availability?.availableQuantity ?? product.quantity ?? 0,
        grade: resolveProductGrade(product),
      };
    });
  }, [products, resolveProductGrade]);

  const catalogProductMap = useMemo(() => {
    return transformedProducts.reduce<Record<string, typeof transformedProducts[number]>>((acc, product) => {
      if (product.id) {
        acc[product.id] = product;
      }
      return acc;
    }, {});
  }, [transformedProducts]);

  const featuredProducts = useMemo(() => {
    return transformedProducts
      .filter(product => (product.grade || '').toLowerCase() === 'premium')
      .slice(0, FEATURED_LIMIT);
  }, [transformedProducts]);

  const recommendedCards = useMemo(() => {
    const seenIds = new Set();
    return recommendations
      .filter(rec => {
        if (!rec.product || seenIds.has(rec.productId)) return false;
        seenIds.add(rec.productId);
        return true;
      })
      .map(rec => {
        const product = rec.product!;
        const primaryImage =
          (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) ||
          product.image ||
          product.imageUrl ||
          product.coverImage ||
          product.coverPhoto ||
          product.thumbnail;

        const imageSource = primaryImage
          ? { uri: primaryImage }
          : require('../../assets/images/home/featureCard.png');

        return {
          key: `rec-${rec.productId}`,
          props: {
            id: rec.productId,
            image: imageSource,
            title: product.title,
            description: rec.reason,
            price: product.price ? product.price.toString() : '0',
            location: product.location,
            availability: product.availability?.availableQuantity ?? product.quantity ?? 0,
            grade: catalogProductMap[rec.productId]?.grade ?? resolveProductGrade(product),
          },
        };
      });
  }, [recommendations, resolveProductGrade, catalogProductMap]);

  const handleViewProduct = (productId?: string) => {
    if (!productId) {
      console.warn('No product ID provided for navigation');
      return;
    }

    router.push(`/Product_Pages/ViewProduct?productId=${productId}`);
  };

  if ((user?.role || '').toLowerCase() === 'driver') {
    return <Jobs />;
  }

  return (
    <View style={globalStyles.container}>
      <HomeHeader title="TradeWay" placeholder="Search products" orders={false} profile={false} />
      <ScrollView>
        {user?.role === 'buyer' && (
          <View style={{ marginHorizontal: width * 0.03, marginBottom: 24 }}>
            <FeatureText title="Recommended For You" />
            {recommendationsLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0758C2" />
                <Text style={{ marginTop: 10, color: '#666' }}>Fetching personalized picks...</Text>
              </View>
            ) : recommendationsError ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: 'red', textAlign: 'center' }}>{recommendationsError}</Text>
              </View>
            ) : recommendedCards.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                {recommendedCards.map(({ key, props }, index) => (
                  <ProductCard
                    key={key}
                    id={props.id}
                    image={props.image}
                    title={props.title}
                    description={props.description}
                    price={props.price}
                    location={props.location}
                    availability={props.availability}
                    grade={props.grade}
                    verified
                    onViewDetails={() => handleViewProduct(props.id)}
                    isFavorite={false}
                    onToggleFavorite={() => console.log('Toggle favorite for recommendation', props.id)}
                    compact
                    style={{
                      width: RECOMMENDED_CARD_WIDTH,
                      marginRight: index === recommendedCards.length - 1 ? 0 : 12,
                      marginVertical: 0,
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#666', textAlign: 'center' }}>
                  We will show tailored suggestions once you engage with products.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ marginHorizontal: width * 0.03 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <FeatureText title="Featured Products" />
            <TouchableOpacity onPress={() => router.push('/BuyerScreens/AllProducts')}>
              <Text style={{ color: '#0758C2', fontWeight: '600' }}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0758C2" />
              <Text style={{ marginTop: 10, color: '#666' }}>Loading products...</Text>
            </View>
          ) : error ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: 'red', textAlign: 'center' }}>Error loading products: {error}</Text>
            </View>
          ) : featuredProducts.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {featuredProducts.map(item => (
                <View key={item.id} style={{ width: GRID_CARD_WIDTH, marginBottom: 12 }}>
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
                    onViewDetails={() => handleViewProduct(item.id)}
                    isFavorite={item.isFavorite}
                    onToggleFavorite={() => console.log('Toggle favorite for', item.id)}
                    compact
                    style={{ height: GRID_CARD_HEIGHT, marginVertical: 0 }}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666', textAlign: 'center' }}>No featured products available at the moment.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;
