import { View, Text, Dimensions, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../Components/HomePage/FeatureCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSellerProducts } from '../store/slices/productSlice';

import HomeHeader from '../Components/HomePage/HomeHeader'
import SearchBar from 'react-native-dynamic-search-bar';
import { router, useFocusEffect } from 'expo-router';

const { height, width } = Dimensions.get('window');
const sortOptions = [
  'Most Recent',
  'Oldest First',
  'Price: High to Low',
  'Price: Low to High',
];

const Post = () => {
  const dispatch = useAppDispatch();
  const { userProducts, isLoading, error, pagination } = useAppSelector(state => state.product);
  const { token, isAuthenticated } = useAppSelector(state => state.auth);

  const [selectedOption, setSelectedOption] = useState('Most Recent');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(fetchSellerProducts());
    }
  }, [dispatch, token, isAuthenticated]);

  // Refresh products when screen comes into focus (e.g., when returning from CreatePost)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && token) {
        dispatch(fetchSellerProducts());
      }
    }, [dispatch, token, isAuthenticated])
  );

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    setDropdownVisible(false);
    // Trigger sorting logic here (e.g., API fetch or list sort)
  };
  return (
    <View style={styles.mainContainer}>
      <HomeHeader title="My Products" profile />

      <SearchBar
        style={{
          height: height * 0.055,
          width: width * 0.9,
          borderRadius: 10,
          borderColor: 'grey',
          borderWidth: 1,
          alignSelf: 'center',
          shadowColor: 'grey',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.9,
          elevation: 5,
          marginTop: 10,
        }}
        value={''}
        fontColor="#c6c6c6"
        iconColor="#c6c6c6"
        shadowColor="grey"
        cancelIconColor="#c6c6c6"
        backgroundColor="white"
        placeholder="Search products"
        clearIconComponent
        onPress={() => alert('onPress')}
      />

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.productsCount}>{pagination.totalProducts} Products Found</Text>
          <View style={styles.container}>
            <TouchableOpacity
              style={styles.dropdownToggle}
              onPress={() => setDropdownVisible(!isDropdownVisible)}
            >
              <Ionicons name="swap-vertical" size={18} color="#4B5563" />
              <Text style={styles.dropdownText}>{selectedOption}</Text>
              <Ionicons
                name={isDropdownVisible ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#4B5563"
              />
            </TouchableOpacity>

            {isDropdownVisible && (
              <View style={styles.dropdown}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleSelect(option)}
                    style={styles.option}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        option === selectedOption && styles.selectedText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0758C2" />
              <Text style={styles.loadingText}>Loading your products...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Error loading products: {error}
              </Text>
            </View>
          ) : userProducts.length > 0 ? (
            userProducts.map((product) => {
              const imageSource = product.images && product.images.length > 0
                ? { uri: product.images[0] }
                : require('../../assets/images/home/featureCard.png');

              return (
                <ProductCard
                  key={product._id}
                  image={imageSource}
                  title={product.title}
                  description={product.description}
                  price={product.price.toString()}
                  location={product.location}
                  rating={4.5} // Default rating since API doesn't provide it
                  availability={product.availability?.availableQuantity?.toString() || "0"}
                  verified={true}
                  onViewDetails={() => console.log("View Details for", product._id)}
                  isFavorite={false}
                  onToggleFavorite={() => console.log("Toggle favorite for", product._id)}
                />
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No products found. Start by creating your first product!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/VendorScreens/CreatePost')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

export default Post


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#0758C2',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  contentContainer: {
    flex: 1,
    marginTop: height * 0.02,
    width: width * 0.9,
    marginHorizontal: width * 0.05,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productsCount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  container: {
    zIndex: 999,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: 'white',
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    right: 0,
    top: 50,
    zIndex: 1000,
  },
  option: {
    padding: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedText: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
});
