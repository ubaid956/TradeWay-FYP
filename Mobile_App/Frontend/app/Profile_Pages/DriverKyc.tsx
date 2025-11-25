import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import CustomHeader from '@/app/Components/Profile_Components/CustomHeader';
import { globalStyles } from '@/Styles/globalStyles';
import InputField from '../Components/InputFiled';
import CustomButton from '../Components/CustomButton';
import { apiService } from '@/src/services/apiService';
import { useAppDispatch } from '@/src/store/hooks';
import { updateUser } from '@/src/store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const statusStyles = {
    not_submitted: { label: 'Not submitted', text: '#6B7280', background: '#E5E7EB' },
    pending: { label: 'Pending review', text: '#92400E', background: '#FEF3C7' },
    approved: { label: 'Approved', text: '#065F46', background: '#D1FAE5' },
    rejected: { label: 'Needs attention', text: '#991B1B', background: '#FEE2E2' },
} as const;

const documentKeys = ['cnicFrontImage', 'cnicBackImage', 'licensePhoto', 'truckPhoto'] as const;
type DocumentKey = typeof documentKeys[number];

type DriverKycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

interface DriverKycFormState {
    cnicNumber: string;
    licenseNumber: string;
    truckRegistrationNumber: string;
    licenseExpiry: string;
    truckType: string;
    yearsOfExperience: string;
    additionalNotes: string;
}

const initialFormState: DriverKycFormState = {
    cnicNumber: '',
    licenseNumber: '',
    truckRegistrationNumber: '',
    licenseExpiry: '',
    truckType: '',
    yearsOfExperience: '',
    additionalNotes: '',
};

const initialDocumentState: Record<DocumentKey, string | null> = {
    cnicFrontImage: null,
    cnicBackImage: null,
    licensePhoto: null,
    truckPhoto: null,
};

const DriverKyc = () => {
    const dispatch = useAppDispatch();
    const [form, setForm] = useState<DriverKycFormState>(initialFormState);
    const [documents, setDocuments] = useState<Record<DocumentKey, string | null>>(initialDocumentState);
    const [pendingUploads, setPendingUploads] = useState<Partial<Record<DocumentKey, string>>>({});
    const [status, setStatus] = useState<DriverKycStatus>('not_submitted');
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const statusMeta = statusStyles[status];

    const requirementList = useMemo(
        () => [
            'Valid CNIC number with clear front and back photos',
            'Heavy vehicle driving license with visible expiry date',
            'Registered truck photo showing number plate',
            'Minimum 1 year of professional driving experience',
        ],
        []
    );

    const mapBackendDetailsToState = useCallback((details?: Record<string, any>) => {
        if (!details) {
            setForm(initialFormState);
            setDocuments(initialDocumentState);
            setPendingUploads({});
            return;
        }

        setForm({
            cnicNumber: details.cnicNumber || '',
            licenseNumber: details.licenseNumber || '',
            truckRegistrationNumber: details.truckRegistrationNumber || '',
            licenseExpiry: details.licenseExpiry ? new Date(details.licenseExpiry).toISOString().split('T')[0] : '',
            truckType: details.truckType || '',
            yearsOfExperience: details.drivingExperienceYears ? String(details.drivingExperienceYears) : '',
            additionalNotes: details.additionalNotes || '',
        });

        setDocuments({
            cnicFrontImage: details.cnicFrontImage || null,
            cnicBackImage: details.cnicBackImage || null,
            licensePhoto: details.licensePhoto || null,
            truckPhoto: details.truckPhoto || null,
        });

        setPendingUploads({});
    }, []);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiService.kyc.getStatus();

            if (!response.success) {
                throw new Error(response.error || 'Unable to load KYC status');
            }

            const payload = response.data?.data || response.data;

            if (payload) {
                setStatus((payload.status as DriverKycStatus) || 'not_submitted');
                setRejectionReason(payload.rejectionReason || null);
                mapBackendDetailsToState(payload.driverDetails);

                if (payload.status === 'approved') {
                    dispatch(updateUser({ isKYCVerified: true }));
                }
            } else {
                setStatus('not_submitted');
                setRejectionReason(null);
                mapBackendDetailsToState();
            }
        } catch (error: any) {
            console.error('Failed to load driver KYC:', error);
            Alert.alert('Error', error.message || 'Could not load KYC status. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [dispatch, mapBackendDetailsToState]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleInputChange = (field: keyof DriverKycFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const pickDocument = async (key: DocumentKey) => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission required', 'Please enable photo library access to upload documents.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
            });

            if (!result.canceled && result.assets?.length) {
                const uri = result.assets[0].uri;
                setDocuments((prev) => ({ ...prev, [key]: uri }));
                setPendingUploads((prev) => ({ ...prev, [key]: uri }));
            }
        } catch (error) {
            console.error('Document picker error:', error);
            Alert.alert('Error', 'Could not open your gallery. Please try again.');
        }
    };

    const validateForm = () => {
        if (!form.cnicNumber.trim() || !form.licenseNumber.trim() || !form.truckRegistrationNumber.trim()) {
            Alert.alert('Missing details', 'CNIC, license number, and truck registration are required.');
            return false;
        }

        if (status === 'not_submitted') {
            const hasMinimumDocs = documents.cnicFrontImage && documents.cnicBackImage && documents.licensePhoto && documents.truckPhoto;
            if (!hasMinimumDocs) {
                Alert.alert('Documents required', 'Please upload all requested documents before submitting.');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (submitting) return;
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            const payload: Record<string, any> = {
                cnicNumber: form.cnicNumber.trim(),
                licenseNumber: form.licenseNumber.trim(),
                truckRegistrationNumber: form.truckRegistrationNumber.trim(),
                licenseExpiry: form.licenseExpiry,
                truckType: form.truckType.trim(),
                yearsOfExperience: form.yearsOfExperience.trim(),
                additionalNotes: form.additionalNotes.trim(),
            };

            documentKeys.forEach((key) => {
                if (pendingUploads[key]) {
                    payload[key] = pendingUploads[key];
                }
            });

            const response = await apiService.kyc.submitDriverKyc(payload);

            if (!response.success || !response.data?.success) {
                throw new Error(response.error || response.data?.message || 'Submission failed');
            }

            Alert.alert('Success', response.data.message || 'KYC submitted successfully.');
            await fetchStatus();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit KYC details.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderDocumentCard = (key: DocumentKey, label: string, helper: string) => (
        <TouchableOpacity key={key} style={styles.docCard} onPress={() => pickDocument(key)}>
            <View style={styles.docPreview}>
                {documents[key] ? (
                    <Image source={{ uri: documents[key] as string }} style={styles.docImage} />
                ) : (
                    <MaterialIcons name="camera-alt" size={28} color="#9CA3AF" />
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>{label}</Text>
                <Text style={styles.docHelper}>{documents[key] ? 'Tap to replace' : helper}</Text>
            </View>
            <MaterialIcons name="upload-file" size={22} color="#0758C2" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.screen}>
            <CustomHeader title="Driver KYC" onBackPress={() => router.back()} />
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#0758C2" />
                </View>
            ) : (
                <ScrollView
                    style={globalStyles.container}
                    contentContainerStyle={{ paddingBottom: height * 0.15 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Verification status</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusMeta.background }]}>
                                <Text style={[styles.statusText, { color: statusMeta.text }]}>
                                    {statusMeta.label}
                                </Text>
                            </View>
                            {status === 'rejected' && rejectionReason && (
                                <Text style={styles.rejectionText}>{rejectionReason}</Text>
                            )}
                        </View>
                        <Text style={styles.sectionSubtitle}>
                            Complete the required information to unlock driver bookings and payments.
                        </Text>
                        <View style={styles.requirementList}>
                            {requirementList.map((item) => (
                                <View key={item} style={styles.requirementItem}>
                                    <MaterialIcons name="check-circle" size={18} color="#10B981" />
                                    <Text style={styles.requirementText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Driver details</Text>
                        <InputField
                            placeholder="CNIC Number"
                            icon="card"
                            value={form.cnicNumber}
                            onChangeText={(value) => handleInputChange('cnicNumber', value)}
                            keyboardType="numeric"
                        />
                        <InputField
                            placeholder="Driving License Number"
                            icon="document-text"
                            value={form.licenseNumber}
                            onChangeText={(value) => handleInputChange('licenseNumber', value)}
                            keyboardType="default"
                        />
                        <InputField
                            placeholder="License Expiry (YYYY-MM-DD)"
                            icon="calendar"
                            value={form.licenseExpiry}
                            onChangeText={(value) => handleInputChange('licenseExpiry', value)}
                            keyboardType="numbers-and-punctuation"
                        />
                        <InputField
                            placeholder="Truck Registration Number"
                            icon="car"
                            value={form.truckRegistrationNumber}
                            onChangeText={(value) => handleInputChange('truckRegistrationNumber', value)}
                        />
                        <InputField
                            placeholder="Truck Type (e.g. 22-wheeler)"
                            icon="cube"
                            value={form.truckType}
                            onChangeText={(value) => handleInputChange('truckType', value)}
                        />
                        <InputField
                            placeholder="Years of Experience"
                            icon="time"
                            value={form.yearsOfExperience}
                            onChangeText={(value) => handleInputChange('yearsOfExperience', value)}
                            keyboardType="numeric"
                        />
                        <InputField
                            placeholder="Additional notes (optional)"
                            icon="chatbubble-ellipses"
                            value={form.additionalNotes}
                            onChangeText={(value) => handleInputChange('additionalNotes', value)}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Upload documents</Text>
                        {renderDocumentCard('cnicFrontImage', 'CNIC Front', 'Upload front side of your CNIC')}
                        {renderDocumentCard('cnicBackImage', 'CNIC Back', 'Upload back side of your CNIC')}
                        {renderDocumentCard('licensePhoto', 'Driving License', 'Clear photo of your license')}
                        {renderDocumentCard('truckPhoto', 'Truck Photo', 'Truck photo showing number plate')}
                    </View>

                    <CustomButton
                        title={submitting ? 'Submitting...' : 'Submit for review'}
                        onPress={handleSubmit}
                        small
                    />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: {
        backgroundColor: 'white',
        marginHorizontal: width * 0.04,
        marginTop: height * 0.02,
        padding: width * 0.04,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: width * 0.045,
        fontWeight: '700',
        color: '#111827',
        marginBottom: height * 0.015,
    },
    sectionSubtitle: {
        fontSize: width * 0.035,
        color: '#6B7280',
        marginTop: height * 0.01,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontWeight: '600',
        fontSize: width * 0.035,
    },
    rejectionText: {
        flex: 1,
        textAlign: 'right',
        color: '#B91C1C',
        fontSize: width * 0.032,
    },
    requirementList: {
        marginTop: height * 0.02,
        gap: 10,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requirementText: {
        color: '#374151',
        fontSize: width * 0.035,
        flex: 1,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: height * 0.015,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    docPreview: {
        width: 54,
        height: 54,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    docImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    docLabel: {
        fontSize: width * 0.04,
        fontWeight: '600',
        color: '#111827',
    },
    docHelper: {
        fontSize: width * 0.032,
        color: '#6B7280',
    },
});

export default DriverKyc;

