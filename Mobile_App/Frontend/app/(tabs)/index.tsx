import { globalStyles } from '@/Styles/globalStyles';
import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, View, ActivityIndicator, Text } from 'react-native';
import { SimpleGrid } from "react-native-super-grid";
import CategoryList from '../Components/HomePage/CategoryList';
import ProductCard from '../Components/HomePage/FeatureCard';
import FeatureText from '../Components/HomePage/FeatureText';
import HomeHeader from '../Components/HomePage/HomeHeader';
import TrasnportCard from '../Components/HomePage/TrasnportCard';

// Redux imports
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchProducts } from '../store/slices/productSlice';
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

  // Fetch products when component mounts
  useEffect(() => {
    console.log('Fetching products from API...');
    dispatch(fetchProducts());
  }, [dispatch]);

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
  return (
    <View style={[globalStyles.container]}>
      <HomeHeader title="TradeWay" />
      <ScrollView>
        {/* <CategoryList
          categories={categoriesData}
          selectedCategory={selectedCategory}
          onCategoryPress={setSelectedCategory}
        /> */}
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
              padding={0}
              spacing={0}
              data={transformedProducts.slice(0)} // Skip first product as it's featured
              renderItem={({ item }) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  rating={item.rating}
                  image={item.image}
                  isFavorite={item.isFavorite}
                  onToggleFavorite={() => console.log("Toggle favorite for", item.id)}
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