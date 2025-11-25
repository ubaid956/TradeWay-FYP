import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { globalStyles } from '@/Styles/globalStyles';
import CustomHeader from '../Components/Headers/CustomHeader';
import { apiService } from '../services/apiService';
import { formatCurrency } from '../utils/currency';
import { Ionicons } from '@expo/vector-icons';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E', dot: '#FBBF24' },
    accepted: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
    withdrawn: { bg: '#E2E8F0', text: '#475569', dot: '#94A3B8' },
};

type MyProposalsProps = {
    showBackButton?: boolean;
};

const MyProposals = ({ showBackButton = true }: MyProposalsProps) => {
    const router = useRouter();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actioningBidId, setActioningBidId] = useState<string | null>(null);

    const fetchBids = useCallback(async () => {
        try {
            setError(null);
            const response = await apiService.bids.getMyBids();
            if (response.success && response.data) {
                const payload = response.data;
                setBids(payload.data || []);
            } else {
                throw new Error(response.error || response.message || 'Unable to fetch proposals');
            }
        } catch (err: any) {
            console.error('Failed to load proposals:', err);
            setError(err.message || 'Unable to fetch proposals');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchBids();
        }, [fetchBids])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchBids();
    };

    const handleViewProduct = (productId?: string) => {
        if (!productId) {
            return;
        }
        router.push(`/Product_Pages/ViewProduct?productId=${productId}`);
    };

    const handleEditBid = (bid: any) => {
        const productId = bid.product?._id || bid.productId;
        if (!productId) {
            Alert.alert('Unavailable', 'Product information is missing for this bid.');
            return;
        }

        router.push({
            pathname: '/BuyerScreens/CreateProposal',
            params: {
                productId,
                bidId: bid._id,
                bidAmount: String(bid.bidAmount),
                quantity: String(bid.quantity),
                message: bid.message || '',
            },
        });
    };

    const executeWithdrawBid = async (bidId: string) => {
        setActioningBidId(bidId);
        try {
            const response = await apiService.bids.withdrawBid(bidId);
            if (!response.success) {
                throw new Error(response.error || response.message || 'Failed to withdraw bid');
            }
            fetchBids();
        } catch (withdrawError: any) {
            Alert.alert('Error', withdrawError.message || 'Could not withdraw bid.');
        } finally {
            setActioningBidId(null);
        }
    };

    const confirmWithdrawBid = (bidId: string) => {
        Alert.alert(
            'Withdraw proposal',
            'Are you sure you want to withdraw this proposal? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw',
                    style: 'destructive',
                    onPress: () => executeWithdrawBid(bidId),
                },
            ]
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No proposals yet</Text>
            <Text style={styles.emptySubtitle}>
                Explore marble listings and submit a proposal to see it appear here.
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/(tabs)')}
                style={styles.secondaryButton}
            >
                <Text style={styles.secondaryButtonText}>Browse Products</Text>
            </TouchableOpacity>
        </View>
    );

    const renderBid = ({ item }: { item: any }) => {
        const product = item.product || {};
        const productId = product._id || product.id || item.productId;
        const statusKey = (item.status || 'pending').toLowerCase();
        const statusPalette = statusColors[statusKey] || statusColors.pending;
        const submittedDate = new Date(item.createdAt).toLocaleDateString();

        const isPending = statusKey === 'pending';
        const isActioning = actioningBidId === item._id;

        return (
            <View style={styles.bidCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={styles.productTitle}>{product.title || 'Untitled Product'}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color="#475569" />
                            <Text style={styles.locationText}>{product.location || 'Location TBD'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusPalette.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusPalette.dot }]} />
                        <Text style={[styles.statusText, { color: statusPalette.text }]}>
                            {item.status?.toUpperCase() || 'PENDING'}
                        </Text>
                    </View>
                </View>
                <View style={styles.metaGrid}>
                    <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Bid Amount</Text>
                        <View style={styles.metaValueRow}>
                            <Ionicons name="cash-outline" size={16} color="#059669" />
                            <Text style={styles.metaValue}>{formatCurrency(item.bidAmount, { fractionDigits: 0 })}</Text>
                        </View>
                    </View>
                    <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Quantity</Text>
                        <View style={styles.metaValueRow}>
                            <Ionicons name="cube-outline" size={16} color="#2563EB" />
                            <Text style={styles.metaValue}>{item.quantity}</Text>
                        </View>
                    </View>
                    <View style={styles.metaBlock}>
                        <Text style={styles.metaLabel}>Submitted</Text>
                        <View style={styles.metaValueRow}>
                            <Ionicons name="time-outline" size={16} color="#EA580C" />
                            <Text style={styles.metaValue}>{submittedDate}</Text>
                        </View>
                    </View>
                </View>

                {item.sellerResponse?.message && (
                    <View style={styles.responseBlock}>
                        <Text style={styles.responseLabel}>Seller response</Text>
                        <Text style={styles.responseMessage}>{item.sellerResponse.message}</Text>
                    </View>
                )}

                {isPending && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditBid(item)}
                            disabled={isActioning}
                        >
                            <Ionicons name="create-outline" size={16} color="#0758C2" />
                            <Text style={styles.editButtonText}>Edit Bid</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.withdrawButton, isActioning && styles.withdrawButtonDisabled]}
                            onPress={() => confirmWithdrawBid(item._id)}
                            disabled={isActioning}
                        >
                            {isActioning ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={16} color="#fff" />
                                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.footerInfo}>
                        <Ionicons name="calendar-outline" size={16} color="#475569" />
                        <Text style={styles.footerText}>Submitted {submittedDate}</Text>
                    </View>
                    <TouchableOpacity style={styles.viewButton} onPress={() => handleViewProduct(productId)}>
                        <Text style={styles.viewButtonText}>View Product</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderListHeader = () => (
        <View style={styles.listHeader}>
            <Text style={styles.screenTitle}>Track your proposals</Text>
            <Text style={styles.screenSubtitle}>
                Stay up to date with every bid you have placed. Pull to refresh any time.
            </Text>
            <View style={styles.legendRow}>
                {Object.keys(statusColors).map(statusKey => (
                    <View key={statusKey} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: statusColors[statusKey]?.dot || '#94A3B8' }]} />
                        <Text style={[styles.legendLabel, { color: statusColors[statusKey]?.text || '#475569' }]}>
                            {statusKey}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={[globalStyles.container, styles.screen]}>
            <CustomHeader
                title="My Proposals"
                onBackPress={() => router.back()}
                showBackButton={showBackButton}
            />

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#0758C2" />
                    <Text style={styles.loadingText}>Loading your proposals...</Text>
                </View>
            ) : (
                <FlatList
                    data={bids}
                    keyExtractor={(item) => item._id || `${item.productId}-${item.createdAt}`}
                    contentContainerStyle={styles.listContent}
                    style={{ flex: 1 }}
                    renderItem={renderBid}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListHeaderComponent={renderListHeader}
                    ListEmptyComponent={renderEmptyState}
                />
            )}

            {error && !loading && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchBids}>
                        <Text style={styles.retryText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        backgroundColor: '#F1F5F9',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    listHeader: {
        paddingHorizontal: 4,
        paddingVertical: 12,
        gap: 8,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    screenSubtitle: {
        fontSize: 14,
        color: '#475569',
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    legendLabel: {
        fontSize: 12,
        color: '#475569',
        textTransform: 'capitalize',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    bidCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    productTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        color: '#475569',
        fontSize: 12,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        marginRight: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    metaGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 14,
        marginBottom: 12,
    },
    metaBlock: {
        flexGrow: 1,
        flexBasis: '30%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
    },
    metaLabel: {
        color: '#94A3B8',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    metaValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    responseBlock: {
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 12,
        marginTop: 8,
    },
    responseLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    responseMessage: {
        color: '#0F172A',
        fontSize: 14,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 12,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        backgroundColor: '#fff',
    },
    editButtonText: {
        color: '#0758C2',
        fontWeight: '600',
    },
    withdrawButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#DC2626',
        flexGrow: 1,
    },
    withdrawButtonDisabled: {
        opacity: 0.7,
    },
    withdrawButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    cardFooter: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#475569',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0758C2',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    viewButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 28,
        marginTop: 40,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 3,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 6,
    },
    emptySubtitle: {
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    secondaryButton: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#0758C2',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    secondaryButtonText: {
        color: '#0758C2',
        fontWeight: '600',
    },
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderTopWidth: 1,
        borderTopColor: '#FECACA',
        padding: 12,
    },
    errorText: {
        color: '#B91C1C',
        textAlign: 'center',
    },
    retryText: {
        color: '#0758C2',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 6,
    },
});

export default MyProposals;
