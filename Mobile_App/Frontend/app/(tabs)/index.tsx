import { globalStyles } from '@/Styles/globalStyles';
import React, { useState, useEffect, useMemo } from 'react';
import { Dimensions, ScrollView, View, ActivityIndicator, Text } from 'react-native';
import { SimpleGrid } from "react-native-super-grid";
import CategoryList from '../Components/HomePage/CategoryList';
import ProductCard from '../Components/HomePage/FeatureCard';
import FeatureText from '../Components/HomePage/FeatureText';
import HomeHeader from '../Components/HomePage/HomeHeader';
import TrasnportCard from '../Components/HomePage/TrasnportCard';

// Redux imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import Jobs from '../Driver/Jobs';
import { fetchProducts } from '../store/slices/productSlice';
import { fetchRecommendations } from '../store/slices/recommendationSlice';
const categoriesData = [
  { id: 1, title: 'All Products', icon: require('../../assets/images/home/allproducts.png') },
  { id: 2, title: 'Marble', icon: require('../../assets/images/home/marble.png') },
  { id: 3, title: 'Transport', icon: require('../../assets/images/home/transport.png') },
  { id: 4, title: 'Equipment', icon: require('../../assets/images/home/equipment.png') },
  { id: 5, title: 'Services', icon: require('../../assets/images/home/services.png') },
];


const { height, width } = Dimensions.get('window');
const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState(1);
  const dispatch = useAppDispatch();
  const { products, isLoading, error } = useAppSelector(state => state.product);
  const { user } = useAppSelector(state => state.auth);
  const {
    items: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useAppSelector(state => state.recommendation);

  // Fetch products when component mounts
  useEffect(() => {
    console.log('Fetching products from API...');
    dispatch(fetchProducts({}));
  }, [dispatch]);

  // If the signed-in user is a driver, render the driver Jobs component instead of buyer Home
  if ((user?.role || '').toLowerCase() === 'driver') {
    return <Jobs />;
  }

  useEffect(() => {
    if (user?.role === 'buyer') {
      dispatch(fetchRecommendations(10));
    }
  }, [dispatch, user?._id, user?.role]);

  // Log when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      console.log('Products loaded from API:', products.length, 'products');
      console.log('First product ID:', products[0]?._id);
    }
  }, [products]);

  // Transform API products to match ProductCard component format
  const transformedProducts = products.map(product => {
    const imageSource = product.images && product.images.length > 0
      ? { uri: product.images[0] }
      : require('../../assets/images/home/featureCard.png');

    const transformedProduct = {
      id: product._id,
      title: product.title,
      price: product.price.toString(),
      rating: 4.5, // Default rating since API doesn't provide it
      image: imageSource,
      isFavorite: false,
      description: product.description,
      location: product.location,
      seller: product.seller.name,
      category: product.category,
    };

    console.log('Transformed product for card:', {
      id: transformedProduct.id,
      title: transformedProduct.title,
      price: transformedProduct.price
    });

    return transformedProduct;
  });

  const recommendedCards = useMemo(() => {
    return recommendations
      .filter((rec) => rec.product)
      .map((rec) => {
        const product = rec.product!;
        const imageSource = product.image
          ? { uri: product.image }
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
            rating: Number((rec.score * 5).toFixed(1)) || 4.5,
            availability: product.freshnessScore ? `${Math.round(product.freshnessScore * 100)}% fresh` : undefined,
          },
        };
      });
  }, [recommendations]);
  return (
    <View style={[globalStyles.container]}>
      <HomeHeader title="TradeWay" placeholder="Search products" orders={false} profile={false} />
      <ScrollView>
        
        {user?.role === 'buyer' && (
          <View style={{ marginHorizontal: width * 0.03, marginBottom: height * 0.02 }}>
            <FeatureText title="Recommended For You" />
            {recommendationsLoading ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0758C2" />
                <Text style={{ marginTop: 10, color: '#666' }}>Fetching personalized picks...</Text>
              </View>
            ) : recommendationsError ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: 'red', textAlign: 'center' }}>
                  {recommendationsError}
                </Text>
              </View>
            ) : recommendedCards.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
                  {recommendedCards.map(({ key, props }, index) => (
                    <View key={key} style={{ marginRight: index === recommendedCards.length - 1 ? 0 : 12 }}>
                      <ProductCard
                        id={props.id}
                        image={props.image}
                        title={props.title}
                        description={props.description}
                        price={props.price}
                        location={props.location}
                        rating={props.rating}
                        availability={props.availability}
                        verified
                        onViewDetails={() => console.log('View details for', props.id)}
                        isFavorite={false}
                        onToggleFavorite={() => console.log('Toggle favorite for recommendation', props.id)}
                        compact
                      />
                    </View>
                  ))}
                </View>
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
        <CategoryList
          categories={categoriesData}
          selectedCategory={selectedCategory}
          onCategoryPress={setSelectedCategory}
        />
        <View style={{ marginHorizontal: width * 0.03, }}>


          <FeatureText title="Featured Products" />

          <View style={{ marginHorizontal: width * 0.02 }}
          >
            {transformedProducts.length > 0 ? (
              <ProductCard
                id={transformedProducts[0].id}
                image={transformedProducts[0].image}
                title={transformedProducts[0].title}
                description={transformedProducts[0].description}
                price={transformedProducts[0].price}
                location={transformedProducts[0].location}
                rating={transformedProducts[0].rating}
                availability={products[0]?.availability?.availableQuantity?.toString() || "0"}
                verified={true}
                onViewDetails={() => console.log("View Details")}
                isFavorite={transformedProducts[0].isFavorite}
                onToggleFavorite={() => console.log("Toggle favorite")}
              />
            ) : (
              <ProductCard
                id="demo-product-1"
                image={require('../../assets/images/home/featureCard.png')}
                title="Italian Carrara Marble"
                description="Premium white marble with light grey veining"
                price="85.00"
                location="Italy"
                rating={4.8}
                availability="2,500"
                verified={true}
                onViewDetails={() => console.log("View Details")}
                isFavorite={false}
                onToggleFavorite={() => console.log("Toggle favorite")}
              />
            )}

          </View>
          <FeatureText title="You May Like" />

          {isLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0758C2" />
              <Text style={{ marginTop: 10, color: '#666' }}>Loading products...</Text>
            </View>
          ) : error ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: 'red', textAlign: 'center' }}>
                Error loading products: {error}
              </Text>
            </View>
          ) : transformedProducts.length > 0 ? (
            <SimpleGrid
              itemDimension={130}
              spacing={0}
              listKey="products-grid"
              data={transformedProducts.slice(0)}
              renderItem={({ item }) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  image={item.image}
                  title={item.title}
                  description={item.description}
                  price={item.price}
                  location={item.location}
                  rating={item.rating}
                  availability={undefined}
                  verified
                  onViewDetails={() => console.log('View details for', item.id)}
                  isFavorite={item.isFavorite}
                  onToggleFavorite={() => console.log('Toggle favorite for', item.id)}
                  compact={true}
                />
              )}
            />
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#666', textAlign: 'center' }}>
                No products available at the moment.
              </Text>
            </View>
          )}
          {/* <FeatureText title="Transport Services" />
          <View style={{ marginBottom: height * 0.02 }}>
          </View>

          <TrasnportCard
            image={require('../../assets/images/home/transport.png')}
            companyName="Marble Transport"
            pricePerKm="1.50"
            location="Italy"
            rating={4.9}
            availability="1000"
            specilization="Specialized in marble transport"
          />


          <TrasnportCard
            image={require('../../assets/images/home/transport.png')}
            companyName="Marble Transport"
            pricePerKm="1.50"
            location="Italy"
            rating={4.9}
            availability="1000"
            specilization="Specialized in marble transport"
          /> */}

        </View>
      </ScrollView>
    </View>
  )
}

export default Home