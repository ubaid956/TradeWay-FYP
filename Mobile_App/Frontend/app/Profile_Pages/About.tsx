import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Alert,
    SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomHeader from '@/app/Components/Profile_Components/CustomHeader';
import { router, useLocalSearchParams } from 'expo-router';
import CustomButton from '@/app/Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUserProfile } from '../store/slices/authSlice';
import { apiService } from '../services/apiService';

const { width, height } = Dimensions.get('window');

const About = () => {
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();

    // Get user data from Redux state
    const { user: reduxUser } = useAppSelector(state => state.auth);
    const currentAbout = reduxUser?.bio || params.currentAbout || '';

    const [selectedAbout, setSelectedAbout] = useState(currentAbout);
    const [isEditing, setIsEditing] = useState(false);
    const [customAbout, setCustomAbout] = useState('');
    const [updating, setUpdating] = useState(false);

    // Update selectedAbout when Redux user data changes
    useEffect(() => {
        if (reduxUser?.bio) {
            setSelectedAbout(reduxUser.bio);
        }
    }, [reduxUser?.bio]);

    const aboutOptions = [
        { key: 'available', text: 'Available' },
        { key: 'busy', text: 'Busy' },
        { key: 'atSchool', text: 'At school' },
        { key: 'atMovies', text: 'At the movies' },
        { key: 'atWork', text: 'At work' },
        { key: 'batteryDying', text: 'Battery about to die' },
        { key: 'whatsappOnly', text: 'Can\'t talk, WhatsApp only' },
        { key: 'inMeeting', text: 'In a meeting' },
        { key: 'atGym', text: 'At the gym' },
        { key: 'sleeping', text: 'Sleeping' },
        { key: 'urgentOnly', text: 'Urgent calls only' }
    ];

    const onSave = async (newAbout) => {
        setUpdating(true);
        try {
            console.log('About: Starting to update bio to:', newAbout);

            // Use the API service for bio update
            const response = await apiService.user.updateProfile({ bio: newAbout });

            console.log('About: Update response:', response);

            if (response.success && response.data) {
                // Update Redux state with complete user data from response
                await dispatch(updateUserProfile(response.data)).unwrap();

                Alert.alert('Success', 'About updated successfully!');
                router.back(); // Navigate back after save
            } else {
                throw new Error(response.error || 'Update failed');
            }
        } catch (error) {
            console.error('About update error:', error);
            Alert.alert('Error', `Failed to update about: ${error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleSave = () => {
        if (isEditing && customAbout.trim()) {
            onSave(customAbout);
        } else if (selectedAbout) {
            onSave(selectedAbout);
        }
        setIsEditing(false);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffff' }}>
            <CustomHeader
                title="About"
                onBackPress={() => router.back()}
            />

            <ScrollView
                style={globalStyles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.content}>
                    {/* Current About */}
                    <View style={styles.currentStatusContainer}>
                        <Text style={styles.currentStatusLabel}>Currently set to</Text>
                        <Text style={styles.currentStatusText}>
                            {currentAbout || 'Not set'}
                        </Text>
                    </View>

                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <Text style={styles.sectionTitle}>Add About</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Type your custom status"
                                value={customAbout}
                                onChangeText={setCustomAbout}
                                autoFocus={true}
                            />
                            <View style={styles.editButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setIsEditing(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSave}
                                    disabled={updating || !customAbout.trim()}
                                >
                                    {updating ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Select About</Text>

                            {aboutOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.optionItem,
                                        selectedAbout === option.text && styles.selectedOption
                                    ]}
                                    onPress={() => setSelectedAbout(option.text)}
                                >
                                    <Text style={styles.optionText}>{option.text}</Text>
                                    {selectedAbout === option.text && (
                                        <MaterialIcons name="check" size={20} color="#0758C2" />
                                    )}
                                </TouchableOpacity>
                            ))}

                            <CustomButton
                                style={styles.editButton}
                                onPress={() => setIsEditing(true)}
                                title="Add Custom About"
                                login
                            />

                            <View style={{ marginBottom: height * 0.015 }} />

                            <CustomButton
                                title={
                                    updating ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        'Save About'
                                    )
                                }
                                onPress={handleSave}
                                disabled={updating || !selectedAbout}
                            />
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    contentContainer: {
        paddingBottom: height * 0.05,
    },
    content: {
        paddingHorizontal: width * 0.05,
        paddingTop: height * 0.02,
    },
    currentStatusContainer: {
        marginBottom: height * 0.03,
        paddingBottom: height * 0.02,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    currentStatusLabel: {
        fontSize: width * 0.035,
        color: '#666',
        marginBottom: height * 0.005,
    },
    currentStatusText: {
        fontSize: width * 0.04,
        color: '#37475A',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: width * 0.04,
        fontWeight: '700',
        color: '#37475A',
        marginTop: height * 0.02,
        marginBottom: height * 0.015,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: height * 0.02,
        paddingHorizontal: width * 0.03,
        borderBottomWidth: 1,
        borderBottomColor: '#f4f4f4',
    },
    selectedOption: {
        backgroundColor: '#f0f7ff',
    },
    optionText: {
        fontSize: width * 0.035,
        color: '#37475A',
    },
    editContainer: {
        marginBottom: height * 0.03,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: width * 0.04,
        fontSize: width * 0.035,
        marginBottom: height * 0.02,
    },
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        flex: 1,
        padding: height * 0.015,
        alignItems: 'center',
        marginRight: width * 0.03,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#37475A',
        fontSize: width * 0.035,
        fontWeight: '500',
    },
    editButton: {
        padding: height * 0.015,
        alignItems: 'center',
        marginVertical: height * 0.02,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#0758C2',
    },
    editButtonText: {
        color: '#0758C2',
        fontSize: width * 0.035,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#0758C2',
        padding: height * 0.015,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: height * 0.02,
    },
    saveButtonText: {
        color: 'white',
        fontSize: width * 0.035,
        fontWeight: 'bold',
    },
});

export default About;
