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
    ActivityIndicator,
    StyleSheet
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { apiService } from '@/src/services/apiService';
import { fetchSellerProducts } from '@/src/store/slices/productSlice';
import CustomButton from '@/app/Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import { groupStyle } from '@/Styles/groupStyle';
import InputField from '../Components/InputFiled';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Product as ProductType } from '@/src/store/slices/productSlice';


import HomeHeader from '../Components/HomePage/HomeHeader'
const { height, width } = Dimensions.get('window');

const fallbackCategoryOptions = [
    { label: 'Marble', value: 'marble' },
    { label: 'Granite', value: 'granite' },
    { label: 'Limestone', value: 'limestone' },
    { label: 'Travertine', value: 'travertine' },
    { label: 'Onyx', value: 'onyx' },
    { label: 'Quartz', value: 'quartz' },
    { label: 'Other', value: 'other' }
];

const fallbackUnitOptions = [
    { label: 'Pieces', value: 'pieces' },
    { label: 'Tons', value: 'tons' },
    { label: 'Cubic Meters', value: 'cubic_meters' },
    { label: 'Square Meters', value: 'square_meters' },
    { label: 'Kilograms', value: 'kg' },
    { label: 'Pounds', value: 'lbs' }
];

type GradingState = 'idle' | 'pending' | 'success' | 'error';

const CreatePost = () => {
    const dispatch = useAppDispatch();
    const { token, user } = useAppSelector(state => state.auth);
    const params = useLocalSearchParams();
    const productParam = Array.isArray(params.productId) ? params.productId[0] : params.productId;
    const editingProductId = typeof productParam === 'string' ? productParam : undefined;
    const isEditing = Boolean(editingProductId);

    const [isLoading, setIsLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isSelectingImages, setIsSelectingImages] = useState(false);
    const [gradingStatus, setGradingStatus] = useState<GradingState>('idle');
    const [gradingError, setGradingError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState(fallbackCategoryOptions);
    const [unitOptions, setUnitOptions] = useState(fallbackUnitOptions);
    const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);
    const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
    const [isPrefilling, setIsPrefilling] = useState(false);
    const [prefillError, setPrefillError] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);


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

    useEffect(() => {
        const fetchTaxonomy = async () => {
            try {
                setIsLoadingTaxonomy(true);
                setTaxonomyError(null);
                const response = await apiService.products.getTaxonomy();
                if (response.success && response.data) {
                    const taxonomyData = response.data?.data || response.data;
                    if (taxonomyData?.categories?.length) {
                        const mappedCategories = taxonomyData.categories.map((cat: any) => ({
                            label: cat.label || cat.name || cat.value,
                            value: cat.value || cat.id || cat.label?.toLowerCase() || 'other'
                        }));
                        setCategoryOptions(mappedCategories);
                        setFormData(prev => {
                            if (mappedCategories.some(option => option.value === prev.category)) {
                                return prev;
                            }
                            const fallbackValue = mappedCategories[0]?.value || prev.category;
                            return { ...prev, category: fallbackValue };
                        });
                    }
                    if (taxonomyData?.units?.length) {
                        const mappedUnits = taxonomyData.units.map((unit: any) => ({
                            label: unit.label || unit.name || unit.value,
                            value: unit.value || unit.id || unit.label?.toLowerCase() || 'pieces'
                        }));
                        setUnitOptions(mappedUnits);
                        setFormData(prev => {
                            if (mappedUnits.some(option => option.value === prev.unit)) {
                                return prev;
                            }
                            const fallbackValue = mappedUnits[0]?.value || prev.unit;
                            return { ...prev, unit: fallbackValue };
                        });
                    }
                }
            } catch (error: any) {
                console.warn('Taxonomy fetch failed:', error?.message || error);
                setTaxonomyError('Using default options while taxonomy sync failed.');
            } finally {
                setIsLoadingTaxonomy(false);
            }
        };

        fetchTaxonomy();
    }, []);

    useEffect(() => {
        if (!isEditing || !editingProductId) {
            setEditingProduct(null);
            return;
        }

        let isMounted = true;

        const loadProduct = async () => {
            try {
                setIsPrefilling(true);
                setPrefillError(null);
                const response = await apiService.products.getProductById(editingProductId, token || undefined);
                if (!response.success) {
                    throw new Error(response.error || 'Failed to load product details');
                }
                const product = response.data?.data || response.data;
                if (!product) {
                    throw new Error('Product not found');
                }

                if (!isMounted) return;

                const quantityValue = product.availability?.availableQuantity ?? product.quantity ?? '';
                const gradeVeining = product.specifications?.veining || '';

                setFormData((prev) => ({
                    ...prev,
                    title: product.title || '',
                    description: product.description || '',
                    veining: gradeVeining,
                    tags: Array.isArray(product.tags) ? product.tags.filter(Boolean) : [],
                    price: product.price?.toString() || '',
                    quantity: quantityValue?.toString() || '',
                    unit: product.unit || prev.unit,
                    location: product.location || '',
                    shipping: !!product.shipping?.isShippingAvailable,
                    category: product.category || prev.category,
                    images: product.images || []
                }));
                setSelectedImages(product.images || []);
                setEditingProduct(product);
                setShowAdvanced(Boolean(gradeVeining || (product.tags && product.tags.length) || product.shipping?.isShippingAvailable));
                setGradingStatus('idle');
                setGradingError(null);
            } catch (error: any) {
                console.error('Failed to prefill product:', error);
                if (!isMounted) return;
                setPrefillError(error.message || 'Unable to load product information.');
            } finally {
                if (isMounted) {
                    setIsPrefilling(false);
                }
            }
        };

        loadProduct();

        return () => {
            isMounted = false;
        };
    }, [isEditing, editingProductId, token]);


    const handleChange = (name: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addTag = () => {
        const sanitized = tagInput.trim();
        if (sanitized && !formData.tags.includes(sanitized)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, sanitized]
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

    const buildProductPayload = (price: number, quantity: number) => {
        const trimmedTitle = formData.title.trim();
        const trimmedDescription = formData.description.trim();
        const trimmedLocation = formData.location.trim();
        const trimmedVeining = formData.veining.trim();
        const uniqueTags = Array.from(new Set(formData.tags.map(tag => tag.trim()).filter(Boolean)));

        const payload: any = {
            title: trimmedTitle,
            description: trimmedDescription,
            category: formData.category,
            price,
            quantity,
            unit: formData.unit,
            location: trimmedLocation,
            availability: {
                isAvailable: quantity > 0,
                availableQuantity: quantity,
                minimumOrder: 1
            },
            shipping: { isShippingAvailable: !!formData.shipping },
            images: selectedImages
        };

        if (uniqueTags.length) {
            payload.tags = uniqueTags;
        }

        if (trimmedVeining) {
            payload.specifications = { veining: trimmedVeining };
        }

        return payload;
    };

    const headerTitle = isEditing ? 'Edit Listing' : 'Post';
    const manualGradingAvailable = Boolean(isEditing && editingProduct && (editingProduct.grading?.status !== 'completed'));

    const handleManualGrading = async () => {
        if (!editingProductId) {
            return;
        }
        if (!selectedImages.length) {
            Alert.alert('Images required', 'At least one image is needed to run AI grading.');
            return;
        }
        try {
            setGradingStatus('pending');
            setGradingError(null);
            const gradeResponse = await apiService.grading.gradeProduct(editingProductId, {
                imageUrls: selectedImages,
                promptContext: `Manual grading triggered while editing by ${user?.name || 'vendor'}`,
            });

            if (!gradeResponse.success) {
                throw new Error(gradeResponse.error || 'Failed to run AI grading.');
            }

            const gradeData = gradeResponse.data?.data || gradeResponse.data;
            setGradingStatus('success');
            setEditingProduct((prev) => (prev ? { ...prev, grading: gradeData } : prev));
            Alert.alert('AI grading complete', gradeData?.summary ? gradeData.summary : 'Grading results are ready.');
            dispatch(fetchSellerProducts());
        } catch (error: any) {
            console.error('Manual grading error:', error);
            setGradingStatus('error');
            setGradingError(error?.message || 'Unable to run AI grading right now.');
        }
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
            const trimmedTitle = formData.title.trim();
            if (trimmedTitle.length < 3) {
                Alert.alert('Error', 'Title must be at least 3 characters long');
                return;
            }

            // Validate description length
            const trimmedDescription = formData.description.trim();
            if (trimmedDescription.length < 10) {
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
            const trimmedLocation = formData.location.trim();
            if (trimmedLocation.length < 2) {
                Alert.alert('Error', 'Please enter a valid location');
                return;
            }

            // Validate category
            if (!formData.category) {
                Alert.alert('Error', 'Please select a category');
                return;
            }

            if (selectedImages.length === 0) {
                Alert.alert('Images required', 'Please upload at least one product image so we can grade it automatically.');
                return;
            }

            setIsLoading(true);
            setGradingStatus('idle');
            setGradingError(null);

            const payload = buildProductPayload(price, quantity);

            if (isEditing && editingProductId) {
                const updateResponse = await apiService.products.updateProduct(editingProductId, payload);
                if (updateResponse.success) {
                    const updatedProduct = updateResponse.data?.data || updateResponse.data;
                    if (updatedProduct) {
                        setEditingProduct(updatedProduct);
                        if (Array.isArray(updatedProduct.images) && updatedProduct.images.length) {
                            setSelectedImages(updatedProduct.images);
                        }
                    }
                    dispatch(fetchSellerProducts());
                    Alert.alert('Listing updated', 'Your product details have been saved.', [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]);
                } else {
                    throw new Error(updateResponse.error || 'Failed to update product');
                }
                return;
            }

            // Call the API to create the product with images
            const response = await apiService.products.createProductWithImages(payload, selectedImages);

            if (response.success) {
                console.log('Product created successfully:', response.data);

                const createdProduct = response.data?.data || response.data;
                let gradeSummary = '';
                let gradeLabel = '';
                let gradingFailed = false;
                let gradeRejected = false;

                if (createdProduct?._id && createdProduct.images?.length) {
                    try {
                        setGradingStatus('pending');
                        const gradeResponse = await apiService.grading.gradeProduct(createdProduct._id, {
                            imageUrls: createdProduct.images,
                            promptContext: `Auto grading during listing creation by ${user?.name || 'vendor'}`,
                        });

                        const gradeData = gradeResponse.data?.data || gradeResponse.data;
                        const normalizedGrade = (gradeData?.grade || '').toLowerCase();
                        gradeSummary = gradeData?.summary || '';
                        gradeLabel = gradeData?.grade || '';

                        if (normalizedGrade === 'reject') {
                            gradeRejected = true;
                            setGradingStatus('error');
                            setGradingError('AI could not verify marble quality from these images. Please upload clearer slab shots and retry grading.');
                        } else {
                            setGradingStatus('success');
                        }
                    } catch (gradingErr: any) {
                        console.error('Product grading error:', gradingErr);
                        gradingFailed = true;
                        setGradingStatus('error');
                        setGradingError(gradingErr.message || 'Unable to grade product automatically.');
                    }
                }

                // Refresh the seller products list
                dispatch(fetchSellerProducts());

                Alert.alert(
                    gradeRejected
                        ? 'Listing posted with grading issue'
                        : gradingFailed
                            ? 'Product posted (grading pending)'
                            : 'Product created and graded',
                    gradeRejected
                        ? 'Your listing is live but our AI rejected the current photos. You can update images and retry grading from the product details screen.'
                        : gradingFailed
                            ? 'Your listing is live but we could not finish AI grading automatically. Please retry from the dashboard.'
                            : `Listing is live and graded${gradeLabel ? ` as ${gradeLabel.toUpperCase()}` : ''}.${gradeSummary ? `\n${gradeSummary}` : ''}`,
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
    if (isEditing && isPrefilling) {
        return (
            <View style={globalStyles.container}>
                <HomeHeader title={headerTitle} profile />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#0758C2" />
                    <Text style={{ marginTop: 12, color: '#374151' }}>Loading listing details...</Text>
                </View>
            </View>
        );
    }

    if (isEditing && prefillError) {
        return (
            <View style={globalStyles.container}>
                <HomeHeader title={headerTitle} profile />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                    <Text style={{ color: '#B42318', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>{prefillError}</Text>
                    <CustomButton title="Go back" onPress={() => router.back()} />
                </View>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <HomeHeader title={headerTitle} profile />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={[groupStyle.container, { paddingBottom: height * 0.08 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {isEditing && (
                        <View style={{
                            backgroundColor: '#E0ECFF',
                            padding: 12,
                            borderRadius: 12,
                            marginBottom: 16,
                            width: width * 0.9,
                            alignSelf: 'center'
                        }}>
                            <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>Editing existing listing</Text>
                            <Text style={{ color: '#1E3A8A', marginTop: 4 }}>
                                Changes are saved instantly for buyers. AI grading runs only when creating a new listing.
                            </Text>
                            {manualGradingAvailable ? (
                                <TouchableOpacity
                                    style={editStyles.manualGradeButton}
                                    onPress={handleManualGrading}
                                    disabled={gradingStatus === 'pending'}
                                >
                                    {gradingStatus === 'pending' ? (
                                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                                    ) : (
                                        <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 8 }} />
                                    )}
                                    <Text style={editStyles.manualGradeButtonText}>
                                        {gradingStatus === 'pending' ? 'Grading…' : 'Run AI grading'}
                                    </Text>
                                </TouchableOpacity>
                            ) : editingProduct?.grading?.grade ? (
                                <Text style={{ color: '#1E3A8A', marginTop: 8 }}>
                                    Current AI grade: {editingProduct.grading.grade.toUpperCase()}
                                </Text>
                            ) : null}
                        </View>
                    )}
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

                    <TouchableOpacity
                        onPress={() => setShowAdvanced(prev => !prev)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: width * 0.85,
                            alignSelf: 'center',
                            paddingVertical: 12,
                            marginTop: 8,
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>Advanced details</Text>
                        <MaterialIcons
                            name={showAdvanced ? 'expand-less' : 'expand-more'}
                            size={24}
                            color="#0758C2"
                        />
                    </TouchableOpacity>

                    {showAdvanced && (
                        <View style={{ width: width * 0.9, alignSelf: 'center' }}>
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
                        </View>
                    )}

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
                        <View style={pickerStyles.container}>
                            <Picker
                                selectedValue={formData.unit}
                                onValueChange={(value) => handleChange('unit', value)}
                                dropdownIconColor="#0758C2"
                                style={pickerStyles.picker}
                                itemStyle={pickerStyles.pickerItem}
                            >
                                {unitOptions.map((option) => (
                                    <Picker.Item
                                        key={option.value}
                                        label={option.label}
                                        value={option.value}
                                        color="#111827"
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
                        <View style={pickerStyles.container}>
                            <Picker
                                selectedValue={formData.category}
                                onValueChange={(value) => handleChange('category', value)}
                                dropdownIconColor="#0758C2"
                                style={pickerStyles.picker}
                                itemStyle={pickerStyles.pickerItem}
                            >
                                {categoryOptions.map((option) => (
                                    <Picker.Item
                                        key={option.value}
                                        label={option.label}
                                        value={option.value}
                                        color="#111827"
                                    />
                                ))}
                            </Picker>
                        </View>
                        {isLoadingTaxonomy && (
                            <Text style={pickerStyles.helperText}>Syncing taxonomy…</Text>
                        )}
                        {taxonomyError && !isLoadingTaxonomy && (
                            <Text style={[pickerStyles.helperText, { color: '#B42318' }]}>{taxonomyError}</Text>
                        )}
                    </View>

                    {/* Images */}
                    <View style={groupStyle.inputWrapper}>
                        <Text style={groupStyle.label}>Images</Text>
                        <TouchableOpacity
                            onPress={pickImages}
                            disabled={isSelectingImages || isEditing}
                            style={{
                                backgroundColor: '#CFCECE',
                                borderRadius: 10,
                                padding: 20,
                                alignItems: 'center',
                                borderStyle: 'dashed',
                                borderWidth: 2,
                                borderColor: '#999',
                                opacity: (isSelectingImages || isEditing) ? 0.6 : 1
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
                                        {isEditing && (
                                            <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 8 }}>
                                                New image uploads will be supported in a future update. You can remove existing photos above or keep them as-is.
                                            </Text>
                                        )}
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

                    {gradingStatus === 'pending' && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12,
                            backgroundColor: '#E8F1FF',
                            padding: 10,
                            borderRadius: 10,
                            width: width * 0.9,
                            alignSelf: 'center'
                        }}>
                            <ActivityIndicator size="small" color="#0758C2" style={{ marginRight: 10 }} />
                            <Text style={{ color: '#0758C2', fontWeight: '600' }}>Running AI grading on your marble images...</Text>
                        </View>
                    )}

                    {gradingStatus === 'error' && gradingError && (
                        <View style={{
                            marginBottom: 12,
                            backgroundColor: '#FFEAEA',
                            padding: 10,
                            borderRadius: 10,
                            width: width * 0.9,
                            alignSelf: 'center'
                        }}>
                            <Text style={{ color: '#C0392B', fontWeight: '600' }}>AI grading failed</Text>
                            <Text style={{ color: '#C0392B', marginTop: 4 }}>{gradingError}</Text>
                        </View>
                    )}

                    {gradingStatus === 'success' && (
                        <View style={{
                            marginBottom: 12,
                            backgroundColor: '#E7F8EF',
                            padding: 10,
                            borderRadius: 10,
                            width: width * 0.9,
                            alignSelf: 'center'
                        }}>
                            <Text style={{ color: '#1E8449', fontWeight: '600' }}>AI grading complete</Text>
                            <Text style={{ color: '#1E8449', marginTop: 4 }}>Grade label has been attached to your listing.</Text>
                        </View>
                    )}

                    <View style={{ marginTop: height * 0.03, marginBottom: height * 0.02 }}>
                        <CustomButton
                            title={
                                isLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    isEditing ? 'Save Changes' : 'Create Product'
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

const pickerStyles = StyleSheet.create({
    container: {
        width: width * 0.85,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: '#CBD5F5',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        minHeight: 52,
        justifyContent: 'center',
        paddingHorizontal: 4,
        marginVertical: 8,
        shadowColor: '#0F172A',
        shadowOpacity: 0.03,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    picker: {
        height: 52,
        color: '#0F172A',
        width: '100%',
    },
    pickerItem: {
        color: '#0F172A',
        fontSize: 16,
    },
    helperText: {
        alignSelf: 'center',
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    }
});

const editStyles = StyleSheet.create({
    manualGradeButton: {
        marginTop: 12,
        backgroundColor: '#1E3A8A',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start'
    },
    manualGradeButtonText: {
        color: '#fff',
        fontWeight: '600'
    }
});

export default CreatePost