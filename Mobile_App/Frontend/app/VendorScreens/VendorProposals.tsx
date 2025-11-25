import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppSelector } from '../store/hooks';
import { apiService } from '../services/apiService';
import CustomHeader from '../Components/Profile_Components/CustomHeader';
import CustomButton from '../Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import { formatCurrency } from '../utils/currency';

const { width, height } = Dimensions.get('window');

type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

interface Proposal {
    _id: string;
    bidder: {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        pic?: string;
    };
    product: {
        _id: string;
        title: string;
        price: number;
        images?: string[];
    };
    bidAmount: number;
    quantity: number;
    message?: string;
    status: ProposalStatus;
    createdAt: string;
    sellerResponse?: {
        message?: string;
        respondedAt?: string;
    };
}

const statusColors = {
    pending: { bg: '#FEF3C7', text: '#92400E', icon: 'schedule' },
    accepted: { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', icon: 'cancel' },
    withdrawn: { bg: '#E5E7EB', text: '#6B7280', icon: 'remove-circle' },
};

const VendorProposals = () => {
    const { token, user } = useAppSelector(state => state.auth);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<ProposalStatus | 'all'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchProposals = useCallback(async (status?: string) => {
        try {
            setLoading(true);
            const response = await apiService.bids.getVendorProposals(status === 'all' ? undefined : status);
            
            if (response.success) {
                const data = response.data?.data || response.data || [];
                setProposals(Array.isArray(data) ? data : []);
            } else {
                throw new Error(response.error || 'Failed to load proposals');
            }
        } catch (error: any) {
            console.error('Error fetching proposals:', error);
            Alert.alert('Error', error.message || 'Failed to load proposals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchProposals(filter === 'all' ? undefined : filter);
        }
    }, [token, filter, fetchProposals]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchProposals(filter === 'all' ? undefined : filter);
    }, [filter, fetchProposals]);

    const handleAccept = async (proposal: Proposal) => {
        Alert.alert(
            'Accept Proposal',
            `Accept ${proposal.bidder.name}'s proposal of ${formatCurrency(proposal.bidAmount, { fractionDigits: 0 })} for ${proposal.quantity} units? This will create an order automatically.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setProcessingId(proposal._id);
                            const response = await apiService.bids.acceptBid(proposal._id);
                            
                            if (response.success) {
                                Alert.alert(
                                    'Success',
                                    'Proposal accepted! Order has been created automatically.',
                                    [{ text: 'OK', onPress: () => fetchProposals(filter === 'all' ? undefined : filter) }]
                                );
                            } else {
                                throw new Error(response.error || 'Failed to accept proposal');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to accept proposal');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (proposal: Proposal) => {
        Alert.alert(
            'Reject Proposal',
            `Reject ${proposal.bidder.name}'s proposal?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingId(proposal._id);
                            const response = await apiService.bids.rejectBid(proposal._id);
                            
                            if (response.success) {
                                Alert.alert('Success', 'Proposal rejected successfully', [
                                    { text: 'OK', onPress: () => fetchProposals(filter === 'all' ? undefined : filter) }
                                ]);
                            } else {
                                throw new Error(response.error || 'Failed to reject proposal');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reject proposal');
                        } finally {
                            setProcessingId(null);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPrice = (price: number) => formatCurrency(price, { fractionDigits: 0 });

    const filteredProposals = proposals.filter(p => filter === 'all' || p.status === filter);

    if (loading && proposals.length === 0) {
        return (
            <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 10, color: '#666' }}>Loading proposals...</Text>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <CustomHeader
                title="Product Proposals"
                onBackPress={() => router.back()}
            />

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'pending', 'accepted', 'rejected'] as const).map((status) => (
                    <TouchableOpacity
                        key={status}
                        style={[
                            styles.filterTab,
                            filter === status && styles.filterTabActive,
                        ]}
                        onPress={() => setFilter(status)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === status && styles.filterTextActive,
                            ]}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {filteredProposals.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="inbox" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>No proposals found</Text>
                        <Text style={styles.emptySubtext}>
                            {filter === 'all'
                                ? 'You have no proposals yet'
                                : `No ${filter} proposals`}
                        </Text>
                    </View>
                ) : (
                    filteredProposals.map((proposal) => {
                        const statusStyle = statusColors[proposal.status];
                        const isProcessing = processingId === proposal._id;

                        return (
                            <View key={proposal._id} style={styles.proposalCard}>
                                {/* Header */}
                                <View style={styles.proposalHeader}>
                                    <View style={styles.buyerInfo}>
                                        <Image
                                            source={
                                                proposal.bidder.pic && proposal.bidder.pic !== 'null'
                                                    ? { uri: proposal.bidder.pic }
                                                    : require('../../assets/images/user.jpg')
                                            }
                                            style={styles.buyerAvatar}
                                        />
                                        <View style={styles.buyerDetails}>
                                            <Text style={styles.buyerName}>{proposal.bidder.name}</Text>
                                            <Text style={styles.buyerEmail}>{proposal.bidder.email}</Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: statusStyle.bg },
                                        ]}
                                    >
                                        <MaterialIcons
                                            name={statusStyle.icon as any}
                                            size={16}
                                            color={statusStyle.text}
                                        />
                                        <Text
                                            style={[
                                                styles.statusText,
                                                { color: statusStyle.text },
                                            ]}
                                        >
                                            {proposal.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Product Info */}
                                <View style={styles.productInfo}>
                                    <Text style={styles.productTitle}>{proposal.product.title}</Text>
                                    <Text style={styles.productPrice}>
                                        Original: {formatPrice(proposal.product.price)}
                                    </Text>
                                </View>

                                {/* Proposal Details */}
                                <View style={styles.proposalDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Proposed Price:</Text>
                                        <Text style={styles.detailValue}>
                                            {formatPrice(proposal.bidAmount)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Quantity:</Text>
                                        <Text style={styles.detailValue}>{proposal.quantity}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Total Amount:</Text>
                                        <Text style={styles.detailValue}>
                                            {formatPrice(proposal.bidAmount * proposal.quantity)}
                                        </Text>
                                    </View>
                                    {proposal.message && (
                                        <View style={styles.messageContainer}>
                                            <Text style={styles.messageLabel}>Message:</Text>
                                            <Text style={styles.messageText}>{proposal.message}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.dateText}>
                                        Submitted: {formatDate(proposal.createdAt)}
                                    </Text>
                                </View>

                                {/* Actions */}
                                {proposal.status === 'pending' && (
                                    <View style={styles.actionsContainer}>
                                        <CustomButton
                                            title={isProcessing ? 'Processing...' : 'Accept'}
                                            onPress={() => handleAccept(proposal)}
                                            disabled={isProcessing}
                                            small
                                        />
                                        <View style={{ width: 10 }} />
                                        <CustomButton
                                            title={isProcessing ? 'Processing...' : 'Reject'}
                                            onPress={() => handleReject(proposal)}
                                            disabled={isProcessing}
                                            small
                                            login
                                        />
                                    </View>
                                )}

                                {proposal.status === 'accepted' && proposal.sellerResponse?.message && (
                                    <View style={styles.responseContainer}>
                                        <Text style={styles.responseLabel}>Your Response:</Text>
                                        <Text style={styles.responseText}>
                                            {proposal.sellerResponse.message}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: width * 0.04,
        paddingVertical: height * 0.015,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    filterTab: {
        paddingHorizontal: width * 0.04,
        paddingVertical: height * 0.01,
        marginRight: width * 0.02,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    filterTabActive: {
        backgroundColor: '#0758C2',
    },
    filterText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: height * 0.1,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
    proposalCard: {
        backgroundColor: '#fff',
        marginHorizontal: width * 0.04,
        marginVertical: height * 0.01,
        padding: width * 0.04,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    proposalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: height * 0.015,
    },
    buyerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    buyerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: width * 0.03,
    },
    buyerDetails: {
        flex: 1,
    },
    buyerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    buyerEmail: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    productInfo: {
        marginBottom: height * 0.015,
        paddingBottom: height * 0.015,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        color: '#6b7280',
    },
    proposalDetails: {
        marginBottom: height * 0.015,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    messageContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
    },
    messageLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#374151',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: height * 0.015,
    },
    responseContainer: {
        marginTop: height * 0.015,
        padding: 12,
        backgroundColor: '#d1fae5',
        borderRadius: 8,
    },
    responseLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065f46',
        marginBottom: 4,
    },
    responseText: {
        fontSize: 14,
        color: '#065f46',
    },
});

export default VendorProposals;

