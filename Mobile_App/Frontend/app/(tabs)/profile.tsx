import { globalStyles } from '@/Styles/globalStyles';
import { MaterialIcons } from '@expo/vector-icons';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import CustomButton from '../Components/CustomButton';
import Profile_cart from '../Components/HomePage/Profile_cart';
import HomeHeader from '../Components/HomePage/HomeHeader';
// import { apiService } from '../services/apiService';
import apiService from '@/src/services/apiService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from "expo-router";

import AsyncStorage from '@react-native-async-storage/async-storage';


// Redux imports
// import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
// import { logoutUser, updateUserProfile, fetchUserProfile } from '../store/slices/authSlice';
import { logoutUser , updateUserProfile, fetchUserProfile} from '@/src/store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const Profile = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Redux state
  const [uploading, setUploading] = useState(false);

  const { user: reduxUser, token, isAuthenticated } = useAppSelector(state => state.auth);

  // Keep Profile UI consistent for all roles here; driver-specific UI is handled under /Driver/Profile

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to reload profile data
  const reloadProfile = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(fetchUserProfile()).unwrap();
    } catch (error) {
      console.error('Failed to reload profile:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const uploadImage = async (imageUri) => {
    setUploading(true);
    try {
      console.log('Upload started for URI:', imageUri);

      if (!token) {
        throw new Error('User not authenticated');
      }

      // Validate image URI
      if (!imageUri || typeof imageUri !== 'string') {
        throw new Error('Invalid image URI');
      }

      console.log('Uploading image using API service...');

      // Use the API service for image upload
      const response = await apiService.user.uploadProfileImage(imageUri);

      console.log('Upload response:', response);

      if (response.success && response.data) {
        // Update Redux state with complete user data from response
        await dispatch(updateUserProfile(response.data)).unwrap();

        // Update local state for immediate UI update
        setUser(response.data);

        // Reload profile to ensure we have the latest data
        await reloadProfile();

        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Error', `Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      console.log('pickImage called, Platform:', Platform.OS);

      // For iOS, use a more cautious approach
      if (Platform.OS === 'ios') {
        // Show alert first to prepare user
        Alert.alert(
          'Select Profile Picture',
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
          // Wrap permission request in additional try-catch for iOS
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

          finalStatus = result.status;
          console.log('Permission request result:', result);
        } catch (permissionError) {
          console.error('Permission request failed:', permissionError);
          Alert.alert(
            'Permission Error',
            'Unable to request photo library permission. Please go to Settings > Privacy & Security > Photos and allow access for this app.',
            [
              { text: 'OK', style: 'default' }
            ]
          );
          return;
        }
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is required to select a profile picture. Would you like to grant permission?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => console.log('User cancelled permission request')
            },
            {
              text: 'Grant Permission',
              onPress: async () => {
                try {
                  console.log('User wants to grant permission, requesting again...');
                  const retryResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  console.log('Retry permission result:', retryResult);

                  if (retryResult.status === 'granted') {
                    // Permission granted, try to open image library again
                    console.log('Permission granted, opening image library...');
                    const imageResult = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: false,
                      quality: 0.1,
                      base64: false,
                      exif: false,
                      allowsMultipleSelection: false,
                    });

                    if (!imageResult.canceled && imageResult.assets && imageResult.assets.length > 0) {
                      const selectedImage = imageResult.assets[0];
                      if (selectedImage.uri && selectedImage.uri.length > 0) {
                        setTimeout(async () => {
                          try {
                            await uploadImage(selectedImage.uri);
                          } catch (uploadError) {
                            console.error('Upload error:', uploadError);
                            Alert.alert('Error', 'Failed to upload image. Please try again.');
                          }
                        }, 500);
                      }
                    }
                  } else {
                    Alert.alert(
                      'Permission Denied',
                      'Photo library access is required to update your profile picture. Please go to Settings > Privacy & Security > Photos and allow access for this app.',
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

      console.log('Opening image library...');

      // Ultra-minimal configuration for maximum iOS compatibility
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.1,
        base64: false,
        exif: false,
        allowsMultipleSelection: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage);

        if (selectedImage.uri && selectedImage.uri.length > 0) {
          console.log('Starting upload...');
          setTimeout(async () => {
            try {
              await uploadImage(selectedImage.uri);
            } catch (uploadError) {
              console.error('Upload error:', uploadError);
              Alert.alert('Error', 'Failed to upload image. Please try again.');
            }
          }, 500);
        } else {
          Alert.alert('Error', 'Invalid image selected. Please try again.');
        }
      }
    } catch (error) {
      console.error('Image library error:', error);
      Alert.alert('Error', `Failed to open photo library: ${error.message}`);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Use Redux user data as primary source
        if (reduxUser) {
          setUser(reduxUser);
          setLoading(false);
          return;
        }

        // Fallback to AsyncStorage only if Redux doesn't have user data
        const userDataString = await AsyncStorage.getItem('user');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setUser(userData);
        }
      } catch (error) {
        console.log('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [reduxUser]);

  // Reload profile when screen comes into focus (only if we don't have user data)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && token && !reduxUser) {
        reloadProfile();
      }
    }, [isAuthenticated, token, reduxUser, reloadProfile])
  );

  // Navigate to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.replace('/Signup-Login/Login');
    }
  }, [isAuthenticated, loading, router]);

  // Logout function
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Dispatch logout action
              await dispatch(logoutUser()).unwrap();

              // Clear local state
              setUser(null);

              // Navigate to login screen
              router.replace('/Signup-Login/Login');

              console.log('Logout successful');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No user data found. Please login again.</Text>
      </View>
    );
  }

  const isDriver = (user.role || '').toLowerCase() === 'driver';


  return (
    <View style={[globalStyles.container]}>
      <HomeHeader title="Profile" profile />

      <ScrollView style={[globalStyles.container, { backgroundColor: "#f4f4f4", marginBottom: height * 0.04 }]}>


        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading}>
            {uploading ? (
              <View style={[styles.profileImage, styles.uploadingContainer]}>
                <ActivityIndicator size="small" color="#007bff" />
              </View>
            ) : (
              <Image
                source={
                  !user.pic || user.pic === 'null'
                    ? require('../../assets/images/user.jpg')
                    : { uri: user.pic }
                }
                style={styles.profileImage}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>



        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>124</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.rating || 0} ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>87</Text>
            <Text style={styles.statLabel}>Deals</Text>
          </View>
        </View>




        <View style={{ backgroundColor: 'white', }}>
          <Text style={{ marginLeft: width * 0.04, fontSize: 16, marginTop: height * 0.02, color: '#6b7280' }}>
            ACCOUNT INFORMATION
          </Text>
          <View style={{ backgroundColor: '#f4f4f4' }}>
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="mail"
              text={user.email}

            />
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="phone"
              text={user.phone || "Phone not provided"}
            />
            <Profile_cart
              onPress={() => router.push('/Profile_Pages/About')}
              iconComponent={MaterialIcons}
              iconName="info"
              text={user.bio || "Luxury Marble Inc"}
            />
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="location-pin"
              text={user.location || "Location not provided"}
            />
            {isDriver ? (
              <Profile_cart
                onPress={() => router.push('/Profile_Pages/DriverKyc')}
                iconComponent={MaterialIcons}
                iconName={user.isKYCVerified ? "verified" : "fact-check"}
                text={user.isKYCVerified ? "Driver KYC • Approved" : "Driver KYC Verification"}
              />
            ) : (
              <Profile_cart
                iconComponent={MaterialIcons}
                iconName={user.isKYCVerified ? "verified" : "warning"}
                text={user.isKYCVerified ? "KYC Verified" : "KYC Not Verified"}
              />
            )}

          </View>

        </View>

        <View style={{ backgroundColor: 'white', marginTop: height * 0.03 }}>
          <Text style={{ marginLeft: width * 0.04, fontSize: 16, marginTop: height * 0.02, color: '#6b7280' }}>
            RECENT ACTIVITY
          </Text>
          <View style={{ backgroundColor: '#f4f4f4' }}>
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="receipt"
              text="Recent Transactions"

            />
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="bookmark-outline"
              text="Saved Items"
            />
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="star"
              text="Review & Ratings"
            />


          </View>

        </View>

        {user.role === 'vendor' && (
          <View style={{ backgroundColor: 'white', marginTop: height * 0.03 }}>
            <Text style={{ marginLeft: width * 0.04, fontSize: 16, marginTop: height * 0.02, color: '#6b7280' }}>
              VENDOR MANAGEMENT
            </Text>
            <View style={{ backgroundColor: '#f4f4f4' }}>
              <Profile_cart
                onPress={() => router.push('/VendorScreens/VendorProposals')}
                iconComponent={MaterialIcons}
                iconName="description"
                text="Product Proposals"
              />
            </View>
          </View>
        )}

        <View style={{ backgroundColor: 'white', marginTop: height * 0.03 }}>
          <Text style={{ marginLeft: width * 0.04, fontSize: 16, marginTop: height * 0.02, color: '#6b7280' }}>
            SETTINGS & SUPPORT
          </Text>
          <View style={{ backgroundColor: '#f4f4f4' }}>
            <Profile_cart
              iconComponent={MaterialIcons}
              iconName="settings"
              text="Account Settings"

            />
            <Profile_cart
              onPress={() => router.push('/Profile_Pages/HelpCenter')}
              iconComponent={MaterialIcons}
              iconName="help"
              text="Help Center"
            />
            <Profile_cart
              onPress={() => router.push('/Profile_Pages/TermsAndPrivacy')}
              iconComponent={MaterialIcons}
              iconName="privacy-tip"
              text="Terms & Privacy"
            />


          </View>

        </View>
        <View style={{ marginTop: height * 0.01 }} />

        <CustomButton title="Logout" logout onPress={handleLogout} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: width * 0.05,
    backgroundColor: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    position: 'relative',
    // marginTop: height * 0.01,
    marginBottom: height * 0.01,
    paddingVertical: height * 0.02,
    // backgroundColor:'red'

  },
  editIconContainer: {
    position: 'absolute',
    top: 8,
    right: 18,
    backgroundColor: '#e6f0ff',
    padding: 8,
    borderRadius: 8,
  },
  // profileImage: {
  //   width: width * 0.3,
  //   height: width * 0.3,
  //   borderRadius: 999,
  //   marginBottom: 10,
  //   borderWidth: 2,
  //   borderColor: '#ccc',
  // },
  profileImage: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  roleBadge: {
    backgroundColor: '#e6f0ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginVertical: 5,
  },
  roleText: {
    color: '#007bff',
    fontWeight: '500',
  },
  subtitle: {
    color: '#666',
    marginBottom: 10,
  },
  statsRow: {

    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: height * 0.01,
    backgroundColor: 'white',
    paddingVertical: height * 0.015
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#555',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    color: '#333',
  },
  newBadge: {
    backgroundColor: '#007bff',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});

export default Profile;
