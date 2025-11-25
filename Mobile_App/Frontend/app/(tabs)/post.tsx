import { View, Text, Dimensions, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../Components/HomePage/FeatureCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSellerProducts } from '../store/slices/productSlice';
import { Picker } from '@react-native-picker/picker';

import HomeHeader from '../Components/HomePage/HomeHeader';
import SearchBar from 'react-native-dynamic-search-bar';
import { router, useFocusEffect } from 'expo-router';
import Tracking from '../Driver/Tracking';
import { formatCurrency } from '../utils/currency';
import { RequirementPayload, Requirement } from '../services/apiService';
import { fetchMyRequirements, createRequirement, updateRequirement, deleteRequirement } from '../store/slices/requirementSlice';

const { height, width } = Dimensions.get('window');
const sortOptions = [
  'Most Recent',
  'Oldest First',
  'Price: High to Low',
  'Price: Low to High',
];

const requirementUnitOptions = [
  { label: 'Tons', value: 'tons' },
  { label: 'Square Feet', value: 'sqft' },
  { label: 'Blocks', value: 'blocks' },
  { label: 'Pieces', value: 'pieces' },
  { label: 'Bags', value: 'bags' },
  { label: 'Units', value: 'units' },
];

const gradeOptions = [
  { label: 'No preference', value: '' },
  { label: 'Premium Export', value: 'premium' },
  { label: 'Standard Commercial', value: 'standard' },
  { label: 'Economy / Utility', value: 'commercial' },
];

const contactOptions = [
  { label: 'Chat', value: 'chat' },
  { label: 'Phone', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'Any', value: 'any' },
];

const statusPills: Record<string, { label: string; color: string; background: string }> = {
  open: { label: 'Open', color: '#0F8B5F', background: '#E6F7F0' },
  in_progress: { label: 'In Progress', color: '#815AC0', background: '#F0E9FB' },
  fulfilled: { label: 'Fulfilled', color: '#026AA2', background: '#E0F2FF' },
  cancelled: { label: 'Cancelled', color: '#B42318', background: '#FDECEC' },
  expired: { label: 'Expired', color: '#856404', background: '#FFF4E5' },
};

const initialRequirementForm = {
  title: '',
  productType: '',
  gradePreference: '',
  quantityAmount: '',
  quantityUnit: 'tons',
  locationCity: '',
  budgetAmount: '',
  budgetCurrency: 'PKR',
};

const Post = () => {
  const dispatch = useAppDispatch();
  const { userProducts, isLoading, error, pagination } = useAppSelector(state => state.product);
  const { items: requirements, isLoading: requirementsLoading, isSaving: requirementsSaving, error: requirementsError } = useAppSelector(state => state.requirements);
  const { token, isAuthenticated, user } = useAppSelector(state => state.auth);

  const [selectedOption, setSelectedOption] = useState('Most Recent');
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [requirementForm, setRequirementForm] = useState(initialRequirementForm);
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);

  const role = (user?.role || '').toLowerCase();
  const isDriver = role === 'driver';
  const isBuyer = role === 'buyer';
  const isVendor = role === 'vendor';

  useEffect(() => {
    if (isAuthenticated && token && isVendor) {
      dispatch(fetchSellerProducts());
    }
  }, [dispatch, token, isAuthenticated, isVendor]);

  useEffect(() => {
    if (isBuyer && isAuthenticated) {
      dispatch(fetchMyRequirements(undefined));
    }
  }, [dispatch, isBuyer, isAuthenticated]);

  // Refresh products when screen comes into focus (e.g., when returning from CreatePost)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && token && isVendor) {
        dispatch(fetchSellerProducts());
      }
      if (isBuyer && isAuthenticated) {
        dispatch(fetchMyRequirements(undefined));
      }
    }, [dispatch, token, isAuthenticated, isBuyer, isVendor])
  );

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    setDropdownVisible(false);
    // Trigger sorting logic here (e.g., API fetch or list sort)
  };
  const requirementSummary = useMemo(() => {
    const summary = {
      open: 0,
      in_progress: 0,
      fulfilled: 0,
      cancelled: 0,
    } as Record<'open' | 'in_progress' | 'fulfilled' | 'cancelled', number>;

    requirements.forEach((item) => {
      const key = item.status as keyof typeof summary;
      if (summary[key] !== undefined) {
        summary[key] += 1;
      }
    });

    return summary;
  }, [requirements]);

  const handleRequirementChange = (field: keyof typeof requirementForm, value: string) => {
    setRequirementForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetRequirementForm = () => {
    setRequirementForm(initialRequirementForm);
    setEditingRequirementId(null);
  };

  const buildRequirementPayload = (): RequirementPayload | null => {
    const title = requirementForm.title.trim();
    const productType = requirementForm.productType.trim();
    const locationCity = requirementForm.locationCity.trim();
    const budgetAmount = Number(requirementForm.budgetAmount);
    const quantityAmount = Number(requirementForm.quantityAmount);

    if (!title || !productType || !locationCity || !budgetAmount || !quantityAmount) {
      Alert.alert('Missing information', 'Title, type, quantity, location, and budget are required.');
      return null;
    }

    const payload: RequirementPayload = {
      title,
      productType,
      gradePreference: requirementForm.gradePreference.trim() || undefined,
      quantityAmount,
      quantityUnit: requirementForm.quantityUnit,
      locationCity,
      budgetAmount,
      budgetCurrency: requirementForm.budgetCurrency || 'PKR',
    };

    return payload;
  };

  const handleRequirementSubmit = async () => {
    const payload = buildRequirementPayload();
    if (!payload) return;

    try {
      if (editingRequirementId) {
        await dispatch(updateRequirement({ requirementId: editingRequirementId, updates: payload })).unwrap();
      } else {
        await dispatch(createRequirement(payload)).unwrap();
      }
      resetRequirementForm();
    } catch (err: any) {
      Alert.alert('Something went wrong', err?.message || 'Unable to save requirement.');
    }
  };

  const handleEditRequirement = (requirement: Requirement) => {
    setEditingRequirementId(requirement._id);
    setRequirementForm({
      title: requirement.title || '',
      productType: requirement.productType || '',
      gradePreference: requirement.gradePreference || '',
      quantityAmount: requirement.quantity?.amount?.toString() || '',
      quantityUnit: requirement.quantity?.unit || 'tons',
      locationCity: requirement.location?.city || '',
      budgetAmount: requirement.budget?.amount?.toString() || '',
      budgetCurrency: requirement.budget?.currency || 'PKR',
    });
  };

  const handleDeleteRequirement = (requirementId: string) => {
    Alert.alert(
      'Remove requirement',
      'Are you sure you want to delete this requirement posting?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteRequirement(requirementId)).unwrap();
              if (editingRequirementId === requirementId) {
                resetRequirementForm();
              }
            } catch (err: any) {
              Alert.alert('Deletion failed', err?.message || 'Unable to delete requirement');
            }
          },
        },
      ]
    );
  };

  const handleMarkStatus = (requirement: Requirement, nextStatus: Requirement['status']) => {
    Alert.alert(
      nextStatus === 'cancelled' ? 'Cancel requirement' : 'Mark as fulfilled',
      nextStatus === 'cancelled'
        ? 'Buyers will no longer see this request. Continue?'
        : 'Marking fulfilled signals that the requirement has been matched.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'default',
          onPress: async () => {
            try {
              await dispatch(updateRequirement({ requirementId: requirement._id, updates: { status: nextStatus } })).unwrap();
            } catch (err: any) {
              Alert.alert('Update failed', err?.message || 'Unable to update requirement status');
            }
          },
        },
      ]
    );
  };

  const renderVendorContent = () => (
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
                  availability={product.availability?.availableQuantity?.toString() || "0"}
                  verified={true}
                  onViewDetails={() => console.log("View Details for", product._id)}
                  isFavorite={false}
                  onToggleFavorite={() => console.log("Toggle favorite for", product._id)}
                  grade={product.specifications?.grade ?? product.grading?.grade ?? null}
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
    );

    const renderRequirementCard = (requirement: Requirement) => {
      const pill = statusPills[requirement.status] || statusPills.open;
      const tags = requirement.tags?.filter(Boolean) || [];
      const visibleTags = tags.slice(0, 4);
      const extraTags = Math.max(0, tags.length - visibleTags.length);
      const contactLabel = contactOptions.find(option => option.value === requirement.contactPreference)?.label;

      return (
        <View key={requirement._id} style={styles.requirementCard}>
          <View style={styles.requirementHeader}>
            <View>
              <Text style={styles.requirementTitle}>{requirement.title}</Text>
              <Text style={styles.requirementSubtitle}>{requirement.productType || 'General stone requirement'}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: pill.background }]}> 
              <Text style={[styles.statusPillText, { color: pill.color }]}>{pill.label}</Text>
            </View>
          </View>

          <View style={styles.requirementChipRow}>
            {requirement.productType ? (
              <View style={styles.metaChip}>
                <Ionicons name="cube-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.metaChipLabel}>{requirement.productType}</Text>
              </View>
            ) : null}
            {requirement.gradePreference ? (
              <View style={styles.metaChip}>
                <Ionicons name="ribbon-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.metaChipLabel}>Grade {requirement.gradePreference}</Text>
              </View>
            ) : null}
            {contactLabel ? (
              <View style={styles.metaChip}>
                <Ionicons name="call-outline" size={14} color="#4B5563" style={{ marginRight: 4 }} />
                <Text style={styles.metaChipLabel}>{contactLabel} contact</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.requirementMetaRow}>
            <Text style={styles.requirementMetaLabel}>Quantity</Text>
            <Text style={styles.requirementMetaValue}>{`${requirement.quantity?.amount ?? 0} ${requirement.quantity?.unit || 'units'}`}</Text>
          </View>
          <View style={styles.requirementMetaRow}>
            <Text style={styles.requirementMetaLabel}>Location</Text>
            <Text style={styles.requirementMetaValue}>{requirement.location?.city}</Text>
          </View>
          <View style={styles.requirementMetaRow}>
            <Text style={styles.requirementMetaLabel}>Budget</Text>
            <Text style={styles.requirementMetaValue}>{formatCurrency(requirement.budget?.amount || 0, { fractionDigits: 0 })}</Text>
          </View>
          {requirement.description ? (
            <Text style={styles.requirementDescription}>{requirement.description}</Text>
          ) : null}

          {visibleTags.length ? (
            <View style={styles.requirementTagsRow}>
              {visibleTags.map((tag) => (
                <View key={`${requirement._id}-${tag}`} style={styles.requirementTag}>
                  <Text style={styles.requirementTagText}>#{tag}</Text>
                </View>
              ))}
              {extraTags > 0 && (
                <View style={styles.requirementTagExtra}>
                  <Text style={styles.requirementTagExtraText}>+{extraTags} more</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.requirementActionsRow}>
            <TouchableOpacity style={styles.textButton} onPress={() => handleEditRequirement(requirement)}>
              <Ionicons name="create-outline" size={18} color="#0758C2" />
              <Text style={styles.textButtonLabel}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={() => handleDeleteRequirement(requirement._id)}>
              <Ionicons name="trash-outline" size={18} color="#B42318" />
              <Text style={[styles.textButtonLabel, { color: '#B42318' }]}>Delete</Text>
            </TouchableOpacity>
            {requirement.status === 'open' && (
              <TouchableOpacity style={styles.textButton} onPress={() => handleMarkStatus(requirement, 'fulfilled')}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#0F8B5F" />
                <Text style={[styles.textButtonLabel, { color: '#0F8B5F' }]}>Mark fulfilled</Text>
              </TouchableOpacity>
            )}
            {requirement.status === 'open' && (
              <TouchableOpacity style={styles.textButton} onPress={() => handleMarkStatus(requirement, 'cancelled')}>
                <Ionicons name="close-circle-outline" size={18} color="#B42318" />
                <Text style={[styles.textButtonLabel, { color: '#B42318' }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    };

    const renderBuyerContent = () => (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.buyerScrollContent}>
          <HomeHeader title="Requirement Posting" profile />

          <View style={styles.cardContainer}>
            <Text style={styles.sectionTitle}>{editingRequirementId ? 'Edit Requirement' : 'Post a Requirement'}</Text>
            <View style={styles.formGrid}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Requirement title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Need Premium Ziarat White"
                  value={requirementForm.title}
                  onChangeText={(text) => handleRequirementChange('title', text)}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Product type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Stone or finish"
                  value={requirementForm.productType}
                  onChangeText={(text) => handleRequirementChange('productType', text)}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Preferred grade</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={requirementForm.gradePreference}
                    onValueChange={(value) => handleRequirementChange('gradePreference', value)}
                    style={styles.picker}
                    dropdownIconColor="#0758C2"
                    itemStyle={styles.pickerItem}
                  >
                    {gradeOptions.map(option => (
                      <Picker.Item
                        key={option.value || 'none'}
                        label={option.label}
                        value={option.value}
                        color={option.value ? '#111827' : '#6B7280'}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.formSplitRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 10 }]}> 
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g., 500"
                    value={requirementForm.quantityAmount}
                    onChangeText={(text) => handleRequirementChange('quantityAmount', text)}
                  />
                </View>
                <View style={[styles.formField, { width: 150 }]}> 
                  <Text style={styles.inputLabel}>Unit</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={requirementForm.quantityUnit}
                      onValueChange={(value) => handleRequirementChange('quantityUnit', value)}
                      style={styles.picker}
                      dropdownIconColor="#0758C2"
                      itemStyle={styles.pickerItem}
                    >
                      {requirementUnitOptions.map(option => (
                        <Picker.Item key={option.value} label={option.label} value={option.value} color="#111827" />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Preferred city</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City / delivery point"
                  value={requirementForm.locationCity}
                  onChangeText={(text) => handleRequirementChange('locationCity', text)}
                />
              </View>

              <View style={styles.formSplitRow}>
                <View style={[styles.formField, { flex: 1, marginRight: 10 }]}> 
                  <Text style={styles.inputLabel}>Budget (PKR)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g., 450000"
                    value={requirementForm.budgetAmount}
                    onChangeText={(text) => handleRequirementChange('budgetAmount', text)}
                  />
                </View>
                <View style={[styles.formField, { width: 150 }]}> 
                  <Text style={styles.inputLabel}>Currency</Text>
                  <View style={styles.staticValueBox}>
                    <Text style={styles.staticValueText}>{requirementForm.budgetCurrency}</Text>
                  </View>
                </View>
              </View>

            </View>

            {requirementsError ? <Text style={styles.errorText}>Unable to sync requirements: {requirementsError}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleRequirementSubmit} disabled={requirementsSaving}>
              {requirementsSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{editingRequirementId ? 'Update Requirement' : 'Post Requirement'}</Text>
              )}
            </TouchableOpacity>

            {editingRequirementId ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={resetRequirementForm}>
                <Text style={styles.secondaryButtonText}>Cancel editing</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.cardContainer}>
            <Text style={styles.sectionTitle}>Status overview</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { borderColor: '#0F8B5F' }]}> 
                <Text style={styles.summaryLabel}>Open</Text>
                <Text style={styles.summaryValue}>{requirementSummary.open}</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#815AC0' }]}>
                <Text style={styles.summaryLabel}>In Progress</Text>
                <Text style={styles.summaryValue}>{requirementSummary.in_progress}</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#026AA2' }]}>
                <Text style={styles.summaryLabel}>Fulfilled</Text>
                <Text style={styles.summaryValue}>{requirementSummary.fulfilled}</Text>
              </View>
              <View style={[styles.summaryCard, { borderColor: '#B42318' }]}>
                <Text style={styles.summaryLabel}>Cancelled</Text>
                <Text style={styles.summaryValue}>{requirementSummary.cancelled}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Your postings</Text>
              <Text style={styles.sectionSubtle}>{requirements.length} total</Text>
            </View>

            {requirementsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0758C2" />
                <Text style={styles.loadingText}>Loading your requirements...</Text>
              </View>
            ) : requirements.length ? (
              requirements.map(renderRequirementCard)
            ) : (
              <Text style={styles.emptyText}>You have not posted a requirement yet.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );

    if (isDriver) {
      return <Tracking />;
    }

    return isBuyer ? renderBuyerContent() : renderVendorContent();
}

export default Post


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  buyerScrollContent: {
    paddingBottom: 60,
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
  cardContainer: {
    backgroundColor: '#fff',
    marginHorizontal: width * 0.05,
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtle: {
    color: '#6B7280',
    fontSize: 14,
  },
  formGrid: {
    marginTop: 4,
  },
  formField: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  formSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 4,
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
  staticValueBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  staticValueText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0758C2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  requirementCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  requirementChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginHorizontal: -4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  metaChipLabel: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  requirementSubtitle: {
    color: '#6B7280',
    fontSize: 13,
  },
  statusPill: {
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    fontWeight: '600',
    fontSize: 12,
  },
  requirementMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  requirementMetaLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  requirementMetaValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  requirementDescription: {
    marginTop: 8,
    color: '#4B5563',
    lineHeight: 18,
  },
  requirementTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -4,
  },
  requirementTag: {
    backgroundColor: '#E0ECFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  requirementTagText: {
    color: '#0758C2',
    fontSize: 12,
    fontWeight: '600',
  },
  requirementTagExtra: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  requirementTagExtraText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  requirementActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -6,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  textButtonLabel: {
    color: '#0758C2',
    fontWeight: '600',
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
