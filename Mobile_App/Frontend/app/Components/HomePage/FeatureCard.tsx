import { globalStyles } from '@/Styles/globalStyles';
import { Entypo, Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import CustomButton from '../CustomButton';
import { formatCurrency } from '@/src/utils/currency';

const { width, height } = Dimensions.get('window');

const ProductCard = ({
  id,
  image,
  title,
  description,
  price,
  location,
  availability,
  verified,
  isFavorite,
  onToggleFavorite,
  onViewDetails,
  compact = false,
  grade,
  style,
}) => {
  const handleProductPress = () => {
    if (typeof onViewDetails === 'function') {
      onViewDetails();
      return;
    }

    if (id) {
      console.log('Navigating to product details for ID:', id);
      router.push(`/Product_Pages/ViewProduct?productId=${id}`);
    } else {
      console.warn('No product ID available for navigation');
    }
  };

  const normalizedGrade = (grade || '').toLowerCase();
  const gradeLabel = grade || 'Ungraded';
  const formattedPrice = useMemo(() => formatCurrency(price, { fractionDigits: 0 }), [price]);

  const gradeColor = (() => {
    switch (normalizedGrade) {
      case 'premium':
      case 'a':
        return '#16A34A';
      case 'good':
      case 'b':
        return '#EAB308';
      case 'standard':
      case 'commercial':
      case 'c':
        return '#F97316';
      case 'reject':
        return '#DC2626';
      default:
        return '#9CA3AF';
    }
  })();

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard, style]}
      onPress={handleProductPress}
    >
      <Image source={image} style={styles.image} resizeMode="cover" />
      <TouchableOpacity style={styles.favoriteIcon} onPress={onToggleFavorite}>
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#777" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={globalStyles.homeTitle}
          numberOfLines={compact ? 1 : 2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>

        {!compact && (
          <>
            <Text style={styles.desc}>{description}</Text>
            <Text style={styles.price}>
              {formattedPrice} <Text style={styles.per}>per sqm</Text>
            </Text>
            <View style={styles.infoRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Entypo name="location-pin" size={14} color="#666" />
                <Text style={styles.location}>{location}</Text>
              </View>
            </View>
            <View style={styles.bottomRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={styles.available}>Available: {availability} sqm</Text>
                {verified && (
                  <View style={styles.verified}>
                    <Ionicons name="checkmark-circle" size={14} color="white" />
                    <Text style={{ color: 'white', marginLeft: 4, fontSize: 12 }}>Verified</Text>
                  </View>
                )}
              </View>
              <CustomButton
                title="View Details"
                extraSmall
                onPress={handleProductPress}
              />
            </View>
          </>
        )}

        {!compact && (
          <View style={[styles.gradePillFull, { backgroundColor: gradeColor }]}>
            <Text style={[styles.gradeLabel, { color: '#fff' }]}>{gradeLabel}</Text>
          </View>
        )}

        {compact && (
          <View style={styles.compactMeta}>
            <Text style={styles.price}>{formattedPrice}</Text>
            <View style={[styles.gradePill, { backgroundColor: gradeColor }]}>
              <Text style={[styles.gradeLabel, { color: '#fff' }]}>{gradeLabel}</Text>
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
    minHeight: 230,
  },
  compactCard: {
    width: '100%',
    marginVertical: height * 0.01,
    elevation: 2,
    minHeight: 210,
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
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gradePill: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gradePillFull: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
