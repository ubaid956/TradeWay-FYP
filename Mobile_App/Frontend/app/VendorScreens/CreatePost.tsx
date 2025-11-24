import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    TouchableOpacity,
    Alert,
    Switch,
    Image,
    ActivityIndicator
} from 'react-native';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { apiService } from '../services/apiService';
import { fetchSellerProducts } from '../store/slices/productSlice';
import CustomButton from '@/app/Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import { groupStyle } from '@/Styles/groupStyle';
import InputField from '../Components/InputFiled';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';


import HomeHeader from '../Components/HomePage/HomeHeader'
const { height, width } = Dimensions.get('window');

const CreatePost = () => {
    const dispatch = useAppDispatch();
    const { token, user } = useAppSelector(state => state.auth);

    const [isLoading, setIsLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSelectingImages, setIsSelectingImages] = useState(false);

    // Category options
    const categoryOptions = [
        { label: 'Marble', value: 'marble' },
        { label: 'Granite', value: 'granite' },
        { label: 'Limestone', value: 'limestone' },
        { label: 'Travertine', value: 'travertine' },
        { label: 'Onyx', value: 'onyx' },
        { label: 'Quartz', value: 'quartz' },
        { label: 'Other', value: 'other' }
    ];

    // Unit options
    const unitOptions = [
        { label: 'Pieces', value: 'pieces' },
        { label: 'Tons', value: 'tons' },
        { label: 'Cubic Meters', value: 'cubic_meters' },
        { label: 'Square Meters', value: 'square_meters' },
        { label: 'Kilograms', value: 'kg' },
        { label: 'Pounds', value: 'lbs' }
    ];

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        veining: '',
        tags: [] as string[],
        price: '',
        quantity: '',
        unit: 'pieces',
        location: '',
        shipping: false,
        category: 'marble',
        images: [] as string[]
    });


    const handleChange = (name: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const pickImages = async () => {
        try {
            setIsSelectingImages(true);
            console.log('pickImages called, Platform:', Platform.OS);

            // For iOS, use a more cautious approach
            if (Platform.OS === 'ios') {
                Alert.alert(
                    'Select Product Images',
                    'This will open your photo library. Please ensure you have granted photo access permission.',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Continue',
                            onPress: async () => {
                                try {
                                    await openImageLibrary();
                                } catch (error) {
                                    console.error('iOS image picker error:', error);
                                    Alert.alert('Error', 'Failed to open photo library. Please check your permissions in Settings.');
                                }
                            },
                        },
                    ]
                );
            } else {
                // Android - direct approach
                await openImageLibrary();
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to open image picker. Please try again.');
        } finally {
            setIsSelectingImages(false);
        }
    };

    const openImageLibrary = async () => {
        try {
            console.log('Starting image library process...');

            // Check current permission status first
            const currentStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
            console.log('Current permission status:', currentStatus);

            let finalStatus = currentStatus.status;

            // Only request permission if not already granted
            if (currentStatus.status !== 'granted') {
                console.log('Requesting new permissions...');

                try {
                    const result = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Permission request timeout'));
                        }, 8000);

                        ImagePicker.requestMediaLibraryPermissionsAsync()
                            .then((permissionResult) => {
                                clearTimeout(timeout);
                                resolve(permissionResult);
                            })
                            .catch((error) => {
                                clearTimeout(timeout);
                                reject(error);
                            });
                    });

                    console.log('Permission request result:', result);
                    finalStatus = result.status;
                } catch (error) {
                    console.error('Permission request error:', error);
                    Alert.alert(
                        'Permission Required',
                        'Photo library access is required to select images. Would you like to grant permission?',
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel',
                            },
                            {
                                text: 'Grant Permission',
                                onPress: async () => {
                                    try {
                                        const retryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                        console.log('Retry permission result:', retryResult);

                                        if (retryResult.status === 'granted') {
                                            await openImageLibrary();
                                        } else {
                                            Alert.alert(
                                                'Permission Denied',
                                                'Photo library access is required to select images. Please go to Settings > Privacy & Security > Photos and allow access for this app.',
                                                [{ text: 'OK' }]
                                            );
                                        }
                                    } catch (error) {
                                        console.error('Permission retry error:', error);
                                        Alert.alert('Error', 'Failed to request permission. Please try again.');
                                    }
                                }
                            }
                        ]
                    );
                    return;
                }
            }

            if (finalStatus !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Photo library access is required to select images. Please go to Settings > Privacy & Security > Photos and allow access for this app.',
                    [{ text: 'OK' }]
                );
                return;
            }

            console.log('Opening image library...');

            // Launch image library with multiple selection enabled
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
                base64: false,
                exif: false,
                allowsMultipleSelection: true, // Enable multiple selection
            });

            console.log('Image picker result:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImageUris = result.assets.map(asset => asset.uri);
                setSelectedImages(prev => [...prev, ...newImageUris]);
                console.log('Selected images:', newImageUris);
            }
        } catch (error) {
            console.error('Image library error:', error);
            Alert.alert('Error', 'Failed to open image library. Please try again.');
        }
    };

    const removeImage = (imageUri: string) => {
        setSelectedImages(prev => prev.filter(uri => uri !== imageUri));
    };

    const onSubmit = async () => {
        try {
            // Comprehensive validation
            if (!formData.title || !formData.description || !formData.price || !formData.quantity || !formData.location) {
                Alert.alert('Error', 'Please fill all required fields (Title, Description, Price, Quantity, Location)');
                return;
            }

            if (!token || !user) {
                Alert.alert('Error', 'User not authenticated. Please login again.');
                return;
            }

            // Validate title length
            if (formData.title.length < 3) {
                Alert.alert('Error', 'Title must be at least 3 characters long');
                return;
            }

            // Validate description length
            if (formData.description.length < 10) {
                Alert.alert('Error', 'Description must be at least 10 characters long');
                return;
            }

            // Validate price and quantity are valid numbers
            const price = parseFloat(formData.price);
            const quantity = parseInt(formData.quantity);

            if (isNaN(price) || price <= 0) {
                Alert.alert('Error', 'Please enter a valid price (must be greater than 0)');
                return;
            }

            if (isNaN(quantity) || quantity <= 0) {
                Alert.alert('Error', 'Please enter a valid quantity (must be greater than 0)');
                return;
            }

            // Validate location
            if (formData.location.length < 2) {
                Alert.alert('Error', 'Please enter a valid location');
                return;
            }

            // Validate category
            if (!formData.category) {
                Alert.alert('Error', 'Please select a category');
                return;
            }

            setIsLoading(true);

            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                tags: formData.tags,
                price: price,
                quantity: quantity,
                unit: formData.unit,
                location: formData.location,
                specifications: {
                    veining: formData.veining
                },
                availability: {
                    isAvailable: true,
                    availableQuantity: quantity,
                    minimumOrder: 1
                },
                shipping: {
                    isShippingAvailable: formData.shipping
                },
                images: selectedImages
            };

            console.log('Creating product with payload:', payload);
            console.log('Using token:', token ? 'Token available' : 'No token');
            console.log('Selected images:', selectedImages);

            // Call the API to create the product with images
            const response = selectedImages.length > 0
                ? await apiService.products.createProductWithImages(payload, selectedImages)
                : await apiService.products.createProduct(payload);

            if (response.success) {
                console.log('Product created successfully:', response.data);

                // Refresh the seller products list
                dispatch(fetchSellerProducts());

                Alert.alert(
                    'Success',
                    'Product created successfully! Your product is now live on TradeWay.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                console.error('Product creation failed:', response.error);
                Alert.alert(
                    'Error',
                    response.error || 'Failed to create product. Please check your internet connection and try again.',
                    [{ text: 'OK' }]
                );
            }

        } catch (error: any) {
            console.error('Error creating product:', error);

            // Handle specific error types
            let errorMessage = 'An unexpected error occurred. Please try again.';

            if (error.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                errorMessage = 'Authentication failed. Please login again.';
            } else if (error.message?.includes('400')) {
                errorMessage = 'Invalid data provided. Please check your input and try again.';
            } else if (error.message?.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <View style={globalStyles.container}>
            <HomeHeader title="Post" profile />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={[groupStyle.container, { paddingBottom: height * 0.08 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Title *</Text>
                        <InputField
                            placeholder="e.g. Premium Marble for Sale"
                            icon="text"
                            value={formData.title}
                            onChangeText={(text) => handleChange('title', text)}
                        />
                    </View>

                    {/* Description */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Description *</Text>
                        <InputField
                            placeholder="e.g. High-quality marble available for construction projects"
                            icon="document-text"
                            value={formData.description}
                            multiline
                            numberOfLines={4}
                            onChangeText={(text) => handleChange('description', text)}
                        />
                    </View>

                    {/* Veining */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Veining</Text>
                        <InputField
                            placeholder="e.g. White with gray veining"
                            icon="color-palette"
                            value={formData.veining}
                            onChangeText={(text) => handleChange('veining', text)}
                        />
                    </View>

                    {/* Tags */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Tags</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: width * 0.85, }}>
                            <InputField
                                placeholder="Add tag (e.g. premium)"
                                icon="pricetag"
                                value={tagInput}
                                onChangeText={setTagInput}
                                style={{ flex: 1, marginRight: 10 }}
                            />
                            <TouchableOpacity
                                onPress={addTag}
                                style={{
                                    backgroundColor: '#0758C2',
                                    paddingHorizontal: 15,
                                    paddingVertical: 12,
                                    borderRadius: 10,
                                    height: 50,
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                        {formData.tags.length > 0 && (
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                marginTop: 5,
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                backgroundColor: '#CFCECE',
                                borderRadius: 10,
                                minHeight: 50,
                                alignItems: 'flex-start'
                            }}>
                                {formData.tags.map((tag, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => removeTag(tag)}
                                        style={{
                                            backgroundColor: '#0758C2',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 15,
                                            marginRight: 8,
                                            marginBottom: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ color: 'white', marginRight: 5, fontSize: 14 }}>{tag}</Text>
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>×</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Price */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Price *</Text>
                        <InputField
                            placeholder="e.g. 150.00"
                            icon="cash"
                            value={formData.price}
                            onChangeText={(text) => handleChange('price', text)}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Quantity */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Quantity *</Text>
                        <InputField
                            placeholder="e.g. 500"
                            icon="cube"
                            value={formData.quantity}
                            onChangeText={(text) => handleChange('quantity', text)}
                            keyboardType="numeric"
                        />
                    </View>

                    {/* Unit */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Unit</Text>
                        <View style={{
                            flexDirection: 'row',
                            width: width * 0.85,
                            alignItems: 'center',
                            backgroundColor: '#CFCECE',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            alignSelf: 'center',
                            height: height * 0.062,
                            marginVertical: 8,
                        }}>
                            <Picker
                                selectedValue={formData.unit}
                                onValueChange={(value) => handleChange('unit', value)}
                                style={{
                                    flex: 1,
                                    height: height * 0.062,
                                    color: '#000'
                                }}
                                itemStyle={{ color: '#000' }}
                            >
                                {unitOptions.map((option) => (
                                    <Picker.Item
                                        key={option.value}
                                        label={option.label}
                                        value={option.value}
                                        color="#000"
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Location *</Text>
                        <InputField
                            placeholder="e.g. Quetta, Balochistan"
                            icon="location"
                            value={formData.location}
                            onChangeText={(text) => handleChange('location', text)}
                        />
                    </View>

                    {/* Category */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Category</Text>
                        <View style={{
                            flexDirection: 'row',
                            width: width * 0.85,
                            alignItems: 'center',
                            backgroundColor: '#CFCECE',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            alignSelf: 'center',
                            height: height * 0.062,
                            marginVertical: 8,
                        }}>
                            <Picker
                                selectedValue={formData.category}
                                onValueChange={(value) => handleChange('category', value)}
                                style={{
                                    flex: 1,
                                    height: height * 0.062,
                                    color: '#000'
                                }}
                                itemStyle={{ color: '#000' }}
                            >
                                {categoryOptions.map((option) => (
                                    <Picker.Item
                                        key={option.value}
                                        label={option.label}
                                        value={option.value}
                                        color="#000"
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    {/* Shipping */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Shipping Available</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: width * 0.85,
                            backgroundColor: '#CFCECE',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            alignSelf: 'center',
                            height: height * 0.062,
                            marginVertical: 8,
                        }}>
                            <Text style={{ fontSize: 16, color: '#000' }}>Enable shipping</Text>
                            <Switch
                                value={formData.shipping}
                                onValueChange={(value) => handleChange('shipping', value)}
                                trackColor={{ false: '#767577', true: '#0758C2' }}
                                thumbColor={formData.shipping ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    {/* Images */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Images</Text>
                        <TouchableOpacity
                            onPress={pickImages}
                            disabled={isSelectingImages}
                            style={{
                                backgroundColor: '#CFCECE',
                                borderRadius: 10,
                                padding: 20,
                                alignItems: 'center',
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                borderColor: '#999',
                                opacity: isSelectingImages ? 0.6 : 1
                            }}
                        >
                            {isSelectingImages ? (
                                <ActivityIndicator size="small" color="#0758C2" />
                            ) : (
                                <>
                                    <MaterialIcons name="add-photo-alternate" size={24} color="#666" />
                                    <Text style={{ color: '#666', fontSize: 16, marginTop: 5 }}>+ Add Images</Text>
                                    <Text style={{ color: '#999', fontSize: 12, marginTop: 5 }}>
                                        Tap to select product images
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Dedicated Image Display Space - Only shows when images are selected */}
                    {selectedImages.length > 0 && (
                        <View style={{
                            width: width * 0.9,
                            marginBottom: height * 0.02,
                            paddingVertical: 15,
                            backgroundColor: '#f8f9fa',
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#e9ecef'
                        }}>
                            <Text style={{
                                fontSize: 14,
                                color: '#666',
                                marginBottom: 10,
                                fontWeight: '500',
                                paddingHorizontal: 10
                            }}>
                                Selected Images ({selectedImages.length})
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 10, paddingRight: 20 }}
                            >
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {selectedImages.map((imageUri, index) => (
                                        <View key={index} style={{ position: 'relative' }}>
                                            <Image
                                                source={{ uri: imageUri }}
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 8,
                                                    backgroundColor: '#f0f0f0'
                                                }}
                                                resizeMode="cover"
                                            />
                                            <TouchableOpacity
                                                onPress={() => removeImage(imageUri)}
                                                style={{
                                                    position: 'absolute',
                                                    top: -5,
                                                    right: -5,
                                                    backgroundColor: '#ff4444',
                                                    borderRadius: 12,
                                                    width: 24,
                                                    height: 24,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    elevation: 3,
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.25,
                                                    shadowRadius: 3.84,
                                                }}
                                            >
                                                <MaterialIcons name="close" size={16} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    <View style={{ marginTop: height * 0.03, marginBottom: height * 0.02 }}>
                        <CustomButton
                            title={
                                isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    "Create Product"
                                )
                            }
                            onPress={onSubmit}
                            disabled={isLoading}
                            large
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

export default CreatePost