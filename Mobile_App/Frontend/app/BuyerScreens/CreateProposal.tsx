import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import { apiService } from '../services/apiService';
import CustomButton from '../Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import InputField from '../Components/InputFiled';
import CustomHeader from '../Components/Headers/CustomHeader';
import { Ionicons } from '@expo/vector-icons';

const CreateProposal = () => {
    const { productId } = useLocalSearchParams();
    const { token } = useAppSelector(state => state.auth);

    const [isLoading, setIsLoading] = useState(false);
    const [product, setProduct] = useState(null);
    const [formData, setFormData] = useState({
        bidAmount: '',
        quantity: '',
        message: '',
    });
    const [errors, setErrors] = useState({});

    // Fetch product details
    useEffect(() => {
        const fetchProduct = async () => {
            if (!productId) return;

            try {
                const response = await apiService.products.getProductById(productId as string, token);
                if (response.success && response.data) {
                    const productData = response.data.data || response.data;
                    setProduct(productData);
                    console.log('Product loaded for proposal:', productData.title);
                }
            } catch (error) {
                console.error('Error fetching product:', error);
                Alert.alert('Error', 'Failed to load product details');
            }
        };

        fetchProduct();
    }, [productId, token]);

    const validateForm = () => {
        const newErrors = {};

        // Validate bid amount
        if (!formData.bidAmount.trim()) {
            newErrors.bidAmount = 'Bid amount is required';
        } else if (isNaN(parseFloat(formData.bidAmount)) || parseFloat(formData.bidAmount) <= 0) {
            newErrors.bidAmount = 'Please enter a valid bid amount';
        }

        // Validate quantity
        if (!formData.quantity.trim()) {
            newErrors.quantity = 'Quantity is required';
        } else if (isNaN(parseInt(formData.quantity)) || parseInt(formData.quantity) <= 0) {
            newErrors.quantity = 'Please enter a valid quantity';
        } else if (product && parseInt(formData.quantity) > (product.availability?.availableQuantity || product.quantity)) {
            newErrors.quantity = `Quantity cannot exceed available stock (${product.availability?.availableQuantity || product.quantity})`;
        }

        // Validate message (optional but if provided, should not be too long)
        if (formData.message.trim() && formData.message.length > 500) {
            newErrors.message = 'Message cannot exceed 500 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        if (!token) {
            Alert.alert('Authentication Required', 'Please login to create a proposal');
            return;
        }

        setIsLoading(true);

        try {
            const proposalData = {
                productId: productId,
                bidAmount: parseFloat(formData.bidAmount),
                quantity: parseInt(formData.quantity),
                message: formData.message.trim() || undefined,
            };

            console.log('Submitting proposal:', proposalData);

            // Use API service for creating proposal
            const response = await apiService.bids.createBid(proposalData);

            if (response.success) {
                Alert.alert(
                    'Proposal Sent!',
                    'Your proposal has been sent to the seller successfully.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                throw new Error(response.error || response.message || 'Failed to submit proposal');
            }
        } catch (error) {
            console.error('Error submitting proposal:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to submit proposal. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(price);
    };

    if (isLoading && !product) {
        return (
            <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0758C2" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading product details...</Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <CustomHeader
                title="Create Proposal"
                onBackPress={handleBack}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Product Info Section */}
                    {product && (
                        <View style={styles.productSection}>
                            <Text style={styles.sectionTitle}>Product Details</Text>
                            <View style={styles.productCard}>
                                <Text style={styles.productTitle}>{product.title}</Text>
                                <Text style={styles.productPrice}>
                                    {formatPrice(product.price)} per {product.unit?.replace('_', ' ') || 'piece'}
                                </Text>
                                <Text style={styles.productLocation}>
                                    <Ionicons name="location-outline" size={16} color="#666" />
                                    {' '}{product.location}
                                </Text>
                                <Text style={styles.availableStock}>
                                    Available: {product.availability?.availableQuantity || product.quantity} {product.unit?.replace('_', ' ') || 'pieces'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Proposal Form */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Proposal Details</Text>

                        {/* Bid Amount */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bid Amount (USD) *</Text>
                            <InputField
                                placeholder="Enter your bid amount"
                                icon="cash-outline"
                                value={formData.bidAmount}
                                onChangeText={(value) => handleInputChange('bidAmount', value)}
                                keyboardType="numeric"
                            />
                            {errors.bidAmount && (
                                <Text style={styles.errorText}>{errors.bidAmount}</Text>
                            )}
                        </View>

                        {/* Quantity */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Quantity *</Text>
                            <InputField
                                placeholder="Enter quantity needed"
                                icon="cube-outline"
                                value={formData.quantity}
                                onChangeText={(value) => handleInputChange('quantity', value)}
                                keyboardType="numeric"
                            />
                            {errors.quantity && (
                                <Text style={styles.errorText}>{errors.quantity}</Text>
                            )}
                        </View>

                        {/* Message */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Message *</Text>
                            <InputField
                                placeholder="Add a message to the seller..."
                                icon="chatbubble-outline"
                                value={formData.message}
                                onChangeText={(value) => handleInputChange('message', value)}
                                multiline={true}
                                numberOfLines={4}
                                style={styles.messageInput}
                            />
                            <Text style={styles.characterCount}>
                                {formData.message.length}/500 characters
                            </Text>
                            {errors.message && (
                                <Text style={styles.errorText}>{errors.message}</Text>
                            )}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <View style={styles.submitSection}>
                        <CustomButton
                            title={isLoading ? "Submitting..." : "Submit Proposal"}
                            onPress={handleSubmit}

                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = {
    productSection: {
        margin: 20,
        marginBottom: 10,
    },
    formSection: {
        margin: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    productCard: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    productTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    productPrice: {
        fontSize: 16,
        color: '#0758C2',
        fontWeight: '600',
        marginBottom: 5,
    },
    productLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    availableStock: {
        fontSize: 14,
        color: '#28a745',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginLeft: 5,
    },
    messageInput: {
        height: 100,
        alignItems: 'flex-start',
        paddingTop: 10,
    },
    characterCount: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
        marginTop: 5,
        marginRight: 5,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 14,
        marginTop: 5,
        marginLeft: 5,
    },
    submitSection: {
        margin: 20,
        marginTop: 10,
    },
};

export default CreateProposal;
