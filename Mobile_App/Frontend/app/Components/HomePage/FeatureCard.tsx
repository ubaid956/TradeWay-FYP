import { globalStyles } from '@/Styles/globalStyles';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import CustomButton from '../CustomButton';
const { width, height } = Dimensions.get('window');
const ProductCard = ({
  id,
  image,
  title,
  description,
  price,
  location,
  rating,
  availability,
  verified,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
  compact = false, // Add compact prop
}) => {
  const handleProductPress = () => {
    if (id) {
      console.log('Navigating to product details for ID:', id);
      router.push(`/Product_Pages/ViewProduct?productId=${id}`);
    } else {
      console.warn('No product ID available for navigation');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard]}
      onPress={handleProductPress}
    >
      <Image source={image} style={styles.image} />
      <TouchableOpacity style={styles.favoriteIcon} onPress={onToggleFavorite}>
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#777" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={globalStyles.homeTitle}>{title}</Text>

        {!compact && (
          <>
            <Text style={styles.desc}>{description}</Text>
            <Text style={styles.price}>
              ${price} <Text style={styles.per}>per sqm</Text>
            </Text>
            <View style={styles.infoRow}>
              <Entypo name="location-pin" size={14} color="#666" />
              <Text style={styles.location}>{location}</Text>

              <View style={styles.rating}>
                <FontAwesome name="star" size={14} color="#FFD700" />
                <Text style={{ marginLeft: 4 }}>{rating}</Text>
              </View>
            </View>
            <View style={styles.bottomRow}>
              <Text style={styles.available}>Available: {availability} sqm</Text>
              {verified && (
                <View style={styles.verified}>
                  <Ionicons name="checkmark-circle" size={14} color="white" />
                  <Text style={{ color: 'white', marginLeft: 4, fontSize: 12 }}>Verified</Text>
                </View>
              )}
              <CustomButton
                title="View Details"
                extraSmall
                onPress={handleProductPress}
              />
            </View>
          </>
        )}

        {compact && (
          <View >
            <Text style={styles.price}>${price}</Text>
            <View style={styles.rating}>
              <FontAwesome name="star" size={14} color="#FFD700" />
              <Text style={{ marginLeft: 4 }}>{rating}</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};


export default ProductCard;

const styles = StyleSheet.create({
  card: {
    width: width * 0.88,

    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 5,
    marginVertical: height * 0.02,
  },
  compactCard: {
    width: width * 0.45,
    // borderRadius: 10,
    overflow: 'hidden',
    // backgroundColor: 'red',
    //    marginHorizontal: 0,

    // elevation: 3,

  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  image: {
    width: '100%',
    height: 150,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 50,
    elevation: 3,
  },
  content: {
    padding: 12,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    color: '#666',
    marginVertical: 4,
    fontSize: 13,
  },
  price: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  per: {
    fontWeight: 'normal',
    fontSize: 12,
    color: '#555',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  location: {
    fontSize: 13,
    color: '#666',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  available: {
    fontSize: 13,
    color: '#333',
  },
  verified: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#007bff',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  desc: {
    // backgroundColor: 'red',
    paddingHorizontal: width * 0.01,
    marginVertical: height * 0.01,
    fontSize: 13,
    color: '#666',
  }
});
