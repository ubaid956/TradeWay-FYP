import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Share,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons, FontAwesome, Entypo } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { globalStyles } from '@/Styles/globalStyles';
import CustomButton from '../Components/CustomButton';
import CustomHeader from '../Components/Headers/CustomHeader';
import { productsApi } from '../services/apiService';
import { useAppSelector } from '../store/hooks';

const { width, height } = Dimensions.get('window');

const ViewProduct = () => {
    const { productId } = useLocalSearchParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);

    // Get token from Redux store
    const { token } = useAppSelector(state => state.auth);

    // Fetch product data from API
    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) {
                setError('No product ID provided');
                setLoading(false);
                return;
            }

            console.log('Fetching product with ID:', productId);
            console.log('Using token from Redux store:', token ? 'Yes' : 'No');

            try {
                setLoading(true);
                setError(null);

                const response = await productsApi.getProductById(productId as string, token || undefined);

                console.log('Product API response:', response);
                console.log('Response data structure:', {
                    hasData: !!response.data,
                    hasNestedData: !!(response.data && response.data.data),
                    dataKeys: response.data ? Object.keys(response.data) : []
                });

                if (response.success && response.data) {
                    // Extract the actual product data from the nested response
                    const productData = response.data.data || response.data;
                    setProduct(productData);
                    console.log('Product data set:', productData);
                    console.log('Product title:', productData.title);
                    console.log('Product price:', productData.price);
                    console.log('Product description:', productData.description);
                    console.log('Product seller:', productData.seller);
                    console.log('Product seller name:', productData.seller?.name);
                } else {
                    setError(response.error || 'Failed to fetch product');
                }
            } catch (err) {
                console.error('Error fetching product:', err);
                setError('Failed to load product details');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId, token]);

    const handleBack = () => {
        router.back();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this amazing ${product?.title} on TradeWay!`,
                url: `https://tradeway.com/product/${productId}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleCreateProposal = () => {
        if (product?._id) {
            console.log('Navigating to create proposal for product:', product._id);
            router.push(`/BuyerScreens/CreateProposal?productId=${product._id}`);
        } else {
            Alert.alert(
                'Error',
                'Unable to create proposal. Please try again later.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleMessageSeller = () => {
        if (product?.seller?._id) {
            console.log('Navigating to chat with seller:', product.seller._id);
            console.log('Product ID:', productId);
            // Navigate to chat with seller - using userId parameter as expected by ChatMessage
            router.push(`/HomeScreens/ChatMessage?userId=${product.seller._id}&productId=${productId}`);
        } else {
            Alert.alert(
                'Contact Information',
                'Unable to contact seller. Please try again later.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleToggleFavorite = () => {
        setIsFavorite(!isFavorite);
        // Add API call to toggle favorite
    };


    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={[globalStyles.container, styles.loadingContainer]}>
                <CustomHeader title="Product Details" onBackPress={handleBack} />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#0758C2" />
                    <Text style={styles.loadingText}>Loading product details...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[globalStyles.container, styles.errorContainer]}>
                <CustomHeader title="Product Details" onBackPress={handleBack} />
                <View style={styles.errorContent}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ff4757" />
                    <Text style={styles.errorText}>{error}</Text>
                    <CustomButton
                        title="Try Again"
                        onPress={() => {
                            setError(null);
                            setLoading(true);
                            // Retry fetching
                            const fetchProduct = async () => {
                                try {
                                    const response = await productsApi.getProductById(productId as string, token || undefined);
                                    if (response.success && response.data) {
                                        // Extract the actual product data from the nested response
                                        const productData = response.data.data || response.data;
                                        setProduct(productData);
                                    } else {
                                        setError(response.error || 'Failed to fetch product');
                                    }
                                } catch (error) {
                                    console.error('Retry fetch error:', error);
                                    setError('Failed to load product details');
                                } finally {
                                    setLoading(false);
                                }
                            };
                            fetchProduct();
                        }}
                        small
                    />
                </View>
            </View>
        );
    }

    if (!product && !loading) {
        return (
            <View style={[globalStyles.container, styles.errorContainer]}>
                <CustomHeader title="Product Details" onBackPress={handleBack} />
                <View style={styles.errorContent}>
                    <Ionicons name="search-outline" size={64} color="#666" />
                    <Text style={styles.errorText}>Product not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <CustomHeader
                title="Product Details"
                onBackPress={handleBack}
                rightComponent={
                    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                        <Feather name="share-2" size={20} color="#0758C2" />
                    </TouchableOpacity>
                }
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.x / width);
                            setCurrentImageIndex(index);
                        }}
                    >
                        {product.images && product.images.length > 0 ? (
                            product.images.map((image, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: image }}
                                    style={styles.productImage}
                                    resizeMode="cover"
                                />
                            ))
                        ) : (
                            <Image
                                source={require('../../assets/images/home/featureCard.png')}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                        )}
                    </ScrollView>

                    {/* Image indicators */}
                    {product.images && product.images.length > 1 && (
                        <View style={styles.imageIndicators}>
                            {product.images.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.indicator,
                                        index === currentImageIndex && styles.activeIndicator
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Favorite button */}
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={handleToggleFavorite}
                    >
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={24}
                            color={isFavorite ? "#ff4757" : "#fff"}
                        />
                    </TouchableOpacity>
                </View>

                {/* Product Info */}
                <View style={styles.contentContainer}>
                    {/* Price and Title */}
                    <View style={styles.priceSection}>
                        <Text style={styles.price}>{formatPrice(product.price || 0)}</Text>
                        <Text style={styles.priceUnit}>per {product.unit ? product.unit.replace('_', ' ') : 'piece'}</Text>
                    </View>

                    <Text style={styles.title}>{product.title || 'Untitled Product'}</Text>



                    {/* Location and Date */}
                    <View style={styles.locationDateRow}>
                        <View style={styles.locationContainer}>
                            <Entypo name="location-pin" size={16} color="#666" />
                            <Text style={styles.location}>{product.location || 'Location not specified'}</Text>
                        </View>
                        <Text style={styles.date}>Posted {product.createdAt ? formatDate(product.createdAt) : 'Recently'}</Text>
                    </View>

                    {/* Category and Tags */}
                    <View style={styles.categoryContainer}>
                        {product.category && (
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>{product.category.toUpperCase()}</Text>
                            </View>
                        )}
                        {product.tags && product.tags.map((tag, index) => (
                            <View key={index} style={styles.tagBadge}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <View style={styles.descriptionContainer}>
                            <Text style={styles.description}>
                                {product.description || 'No description available'}
                            </Text>
                        </View>

                    </View>

                    {/* Specifications */}

                    {product.specifications && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Specifications</Text>
                            <View style={styles.specsContainer}>
                                {product.specifications.color && (
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Color:</Text>
                                        <Text style={styles.specValue}>{product.specifications.color}</Text>
                                    </View>
                                )}
                                {product.specifications.finish && (
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Finish:</Text>
                                        <Text style={styles.specValue}>{product.specifications.finish}</Text>
                                    </View>
                                )}
                                {product.specifications.thickness && (
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Thickness:</Text>
                                        <Text style={styles.specValue}>{product.specifications.thickness} cm</Text>
                                    </View>
                                )}
                                {product.specifications.origin && (
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Origin:</Text>
                                        <Text style={styles.specValue}>{product.specifications.origin}</Text>
                                    </View>
                                )}
                                {product.specifications.grade && (
                                    <View style={styles.specRow}>
                                        <Text style={styles.specLabel}>Grade:</Text>
                                        <Text style={styles.specValue}>{product.specifications.grade}</Text>
                                    </View>
                                )}
                                {product.specifications.dimensions && (
                                    <>
                                        {product.specifications.dimensions.length && (
                                            <View style={styles.specRow}>
                                                <Text style={styles.specLabel}>Length:</Text>
                                                <Text style={styles.specValue}>{product.specifications.dimensions.length} cm</Text>
                                            </View>
                                        )}
                                        {product.specifications.dimensions.width && (
                                            <View style={styles.specRow}>
                                                <Text style={styles.specLabel}>Width:</Text>
                                                <Text style={styles.specValue}>{product.specifications.dimensions.width} cm</Text>
                                            </View>
                                        )}
                                        {product.specifications.dimensions.height && (
                                            <View style={styles.specRow}>
                                                <Text style={styles.specLabel}>Height:</Text>
                                                <Text style={styles.specValue}>{product.specifications.dimensions.height} cm</Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Availability */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Availability</Text>
                        <View style={styles.availabilityContainer}>
                            <View style={styles.availabilityRow}>
                                <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                                <Text style={styles.availabilityText}>
                                    {product.availability?.availableQuantity || product.quantity || 0} {product.unit ? product.unit.replace('_', ' ') : 'pieces'} available
                                </Text>
                            </View>
                            {product.availability?.minimumOrder && (
                                <View style={styles.availabilityRow}>
                                    <MaterialIcons name="shopping-cart" size={20} color="#666" />
                                    <Text style={styles.availabilityText}>
                                        Minimum order: {product.availability.minimumOrder} {product.unit ? product.unit.replace('_', ' ') : 'pieces'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Shipping */}
                    {product.shipping?.isShippingAvailable && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Shipping</Text>
                            <View style={styles.shippingContainer}>
                                <View style={styles.shippingRow}>
                                    <MaterialIcons name="local-shipping" size={20} color="#666" />
                                    <Text style={styles.shippingText}>
                                        Shipping available - {product.shipping.shippingCost ? formatPrice(product.shipping.shippingCost) : 'Contact seller'}
                                    </Text>
                                </View>
                                {product.shipping.estimatedDelivery && (
                                    <View style={styles.shippingRow}>
                                        <MaterialIcons name="schedule" size={20} color="#666" />
                                        <Text style={styles.shippingText}>
                                            Estimated delivery: {product.shipping.estimatedDelivery} days
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Seller Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Seller Information</Text>

                        <View style={styles.sellerContainer}>
                            <View style={styles.sellerHeader}>
                                <View style={styles.sellerInfo}>
                                    <Text style={styles.sellerName}>
                                        {product.seller?.name || 'Unknown Seller'}
                                    </Text>
                                    <View style={styles.sellerDetails}>
                                        <View style={styles.sellerDetailRow}>
                                            <Ionicons name="mail-outline" size={16} color="#666" />
                                            <Text style={styles.sellerDetailText}>{product.seller?.email || 'No email'}</Text>
                                        </View>
                                        <View style={styles.sellerDetailRow}>
                                            <Ionicons name="call-outline" size={16} color="#666" />
                                            <Text style={styles.sellerDetailText}>{product.seller?.phone || 'No phone'}</Text>
                                        </View>
                                        <View style={styles.sellerDetailRow}>
                                            <Ionicons name="location-outline" size={16} color="#666" />
                                            <Text style={styles.sellerDetailText}>{product.seller?.location || 'No location'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.sellerRating}>
                                        <FontAwesome name="star" size={16} color="#FFD700" />
                                        <Text style={styles.ratingText}>{product.seller?.rating || 'N/A'}</Text>
                                        {product.seller?.totalSales && (
                                            <Text style={styles.salesText}>({product.seller.totalSales} sales)</Text>
                                        )}
                                    </View>
                                </View>
                                {product.seller?.verified && (
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                                        <Text style={styles.verifiedText}>Verified</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.priceContainer}>
                    <Text style={styles.bottomPrice}>{formatPrice(product.price || 0)}</Text>
                    <Text style={styles.bottomPriceUnit}>per {product.unit ? product.unit.replace('_', ' ') : 'piece'}</Text>
                </View>
                <View style={styles.actionButtons}>
                    <CustomButton
                        title="Message"
                        onPress={handleMessageSeller}
                        extraSmall={true}
                        login
                    />
                    <CustomButton
                        title="Proposal"
                        onPress={handleCreateProposal}
                        extraSmall={true}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 18,
        fontWeight: 'bold',
    },
    shareButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        position: 'relative',
        height: height * 0.35,
    },
    productImage: {
        width: width,
        height: height * 0.35,
    },
    imageIndicators: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    activeIndicator: {
        backgroundColor: '#fff',
    },
    favoriteButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 0, // Space for bottom bar
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0758C2',
    },
    priceUnit: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        lineHeight: 28,
    },
    locationDateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    location: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 8,
    },
    categoryBadge: {
        backgroundColor: '#0758C2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    categoryText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tagBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    tagText: {
        color: '#666',
        fontSize: 12,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    descriptionContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    specsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    specLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    specValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    availabilityContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    availabilityText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 10,
    },
    shippingContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
    },
    shippingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    shippingText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 10,
    },
    sellerContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
    },
    sellerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    sellerInfo: {
        flex: 1,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    sellerDetails: {
        marginBottom: 10,
    },
    sellerDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    sellerDetailText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    sellerRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 5,
        fontWeight: '600',
    },
    salesText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 5,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2ecc71',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    bottomBar: {
        // position: 'absolute',
        // bottom: 0,
        // left: 0,
        // right: 0,
        marginBottom: height * 0.04,
        backgroundColor: '#fff',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        elevation: 8,
        marginHorizontal: width * 0.02,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        // elevation: 5
    },
    priceContainer: {
        flex: 1,
    },
    bottomPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0758C2',
    },
    bottomPriceUnit: {
        fontSize: 12,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    debugSection: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        marginVertical: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    debugText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
});

export default ViewProduct;
