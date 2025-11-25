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
    Modal,
    TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { globalStyles } from '@/Styles/globalStyles';
import CustomHeader from '../Components/Headers/CustomHeader';
import { apiService } from '@/src/services/apiService';
import { formatCurrency } from '@/src/utils/currency';
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

type CounterActor = 'buyer' | 'vendor';

interface CounterEntry {
    actor: CounterActor;
    bidAmount: number;
    quantity: number;
    message?: string;
    createdAt?: string;
}

const MyProposals = ({ showBackButton = true }: MyProposalsProps) => {
    const router = useRouter();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actioningBidId, setActioningBidId] = useState<string | null>(null);
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [activeBid, setActiveBid] = useState<any | null>(null);
    const [counterAmount, setCounterAmount] = useState('');
    const [counterQuantity, setCounterQuantity] = useState('');
    const [counterMessage, setCounterMessage] = useState('');
    const [counterSubmitting, setCounterSubmitting] = useState(false);

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

    const closeCounterModal = () => {
        setShowCounterModal(false);
        setActiveBid(null);
        setCounterAmount('');
        setCounterQuantity('');
        setCounterMessage('');
        setCounterSubmitting(false);
    };

    const submitCounterOffer = async () => {
        if (!activeBid) return;
        if (!counterAmount || !counterQuantity) {
            Alert.alert('Missing info', 'Provide both amount and quantity.');
            return;
        }

        const amount = Number(counterAmount);
        const qty = Number(counterQuantity);
        if (Number.isNaN(amount) || Number.isNaN(qty) || amount <= 0 || qty <= 0) {
            Alert.alert('Invalid values', 'Amount and quantity must be positive numbers.');
            return;
        }

        try {
            setCounterSubmitting(true);
            const response = await apiService.bids.counterOffer(activeBid._id, {
                bidAmount: amount,
                quantity: qty,
                message: counterMessage,
            });

            if (!response.success) {
                throw new Error(response.error || response.message || 'Failed to send counter offer');
            }

            Alert.alert('Counter sent', 'Vendor has been notified.', [
                { text: 'OK', onPress: () => fetchBids() }
            ]);
            closeCounterModal();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to send counter offer');
        } finally {
            setCounterSubmitting(false);
        }
    };

    const formatHistoryDate = (dateString?: string) => {
        if (!dateString) return 'Just now';
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const renderBid = ({ item }: { item: any }) => {
        const product = item.product || {};
        const productId = product._id || product.id || item.productId;
        const statusKey = (item.status || 'pending').toLowerCase();
        const statusPalette = statusColors[statusKey] || statusColors.pending;
        const submittedDate = new Date(item.createdAt).toLocaleDateString();

        const isPending = statusKey === 'pending';
        const isActioning = actioningBidId === item._id;
        const awaitingYou: boolean = item.awaitingAction === 'buyer' && isPending;
        const awaitingVendor: boolean = item.awaitingAction === 'vendor' && isPending;
        const history: CounterEntry[] = item.counterHistory || [];

        const openCounterModal = () => {
            const history: CounterEntry[] = item.counterHistory || [];
            const last = history.length ? history[history.length - 1] : null;
            setActiveBid(item);
            setCounterAmount(String(last?.bidAmount || item.bidAmount));
            setCounterQuantity(String(last?.quantity || item.quantity));
            setCounterMessage('');
            setShowCounterModal(true);
        };

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

                {history.length > 1 && (
                    <View style={styles.historyContainer}>
                        <Text style={styles.historyTitle}>Negotiation history</Text>
                        {history.map((entry: CounterEntry, index: number) => (
                            <View key={`${item._id}-history-${index}`} style={styles.historyRow}>
                                <View style={[styles.historyBadge, entry.actor === 'buyer' ? styles.historyBuyer : styles.historyVendor]}>
                                    <Text style={styles.historyBadgeText}>{entry.actor === 'buyer' ? 'You' : 'Vendor'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyAmount}>{formatCurrency(entry.bidAmount, { fractionDigits: 0 })}</Text>
                                    <Text style={styles.historyMeta}>Qty {entry.quantity} • {formatHistoryDate(entry.createdAt)}</Text>
                                    {entry.message ? <Text style={styles.historyMessage}>{entry.message}</Text> : null}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {awaitingVendor && (
                    <Text style={styles.awaitingText}>Waiting for vendor response…</Text>
                )}

                {awaitingYou && (
                    <TouchableOpacity style={styles.counterButton} onPress={openCounterModal}>
                        <Text style={styles.counterButtonText}>Respond with counter offer</Text>
                    </TouchableOpacity>
                )}

                {item.agreement?.amount && item.status === 'accepted' && (
                    <View style={styles.agreementBanner}>
                        <Text style={styles.agreementTitle}>Agreed amount</Text>
                        <Text style={styles.agreementText}>
                            {formatCurrency(item.agreement.amount, { fractionDigits: 0 })} • Qty {item.agreement.quantity || item.quantity}
                        </Text>
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

            <Modal
                visible={showCounterModal}
                transparent
                animationType="slide"
                onRequestClose={closeCounterModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Counter Offer</Text>
                        <Text style={styles.modalSubtitle}>{activeBid?.product?.title || 'Proposal'}</Text>

                        <Text style={styles.modalLabel}>Offer amount</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={counterAmount}
                            onChangeText={setCounterAmount}
                            placeholder="e.g. 120000"
                        />

                        <Text style={styles.modalLabel}>Quantity</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={counterQuantity}
                            onChangeText={setCounterQuantity}
                            placeholder="Number of units"
                        />

                        <Text style={styles.modalLabel}>Message (optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 90 }]}
                            value={counterMessage}
                            onChangeText={setCounterMessage}
                            placeholder="Add a short note"
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={closeCounterModal} disabled={counterSubmitting}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={submitCounterOffer} disabled={counterSubmitting}>
                                <Text style={styles.modalPrimaryText}>{counterSubmitting ? 'Sending…' : 'Send Counter'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    historyContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 12,
        marginTop: 12,
        gap: 12,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    historyRow: {
        flexDirection: 'row',
        gap: 12,
    },
    historyBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    historyBuyer: {
        backgroundColor: '#DBEAFE',
    },
    historyVendor: {
        backgroundColor: '#FCE7F3',
    },
    historyBadgeText: {
        fontWeight: '700',
        color: '#0F172A',
    },
    historyAmount: {
        fontWeight: '700',
        color: '#0F172A',
    },
    historyMeta: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    },
    historyMessage: {
        fontSize: 13,
        color: '#0F172A',
        marginTop: 4,
    },
    awaitingText: {
        marginTop: 12,
        color: '#92400E',
        fontWeight: '600',
    },
    counterButton: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#0758C2',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    counterButtonText: {
        color: '#0758C2',
        fontWeight: '700',
    },
    agreementBanner: {
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#ECFDF5',
    },
    agreementTitle: {
        color: '#047857',
        fontWeight: '600',
    },
    agreementText: {
        color: '#065F46',
        marginTop: 4,
        fontWeight: '700',
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
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalSubtitle: {
        color: '#475569',
        marginBottom: 12,
    },
    modalLabel: {
        marginTop: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    modalInput: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelButton: {
        borderWidth: 1,
        borderColor: '#CBD5F5',
        backgroundColor: '#fff',
    },
    modalPrimaryButton: {
        backgroundColor: '#0758C2',
    },
    modalCancelText: {
        color: '#0F172A',
        fontWeight: '600',
    },
    modalPrimaryText: {
        color: '#fff',
        fontWeight: '700',
    },
});

export default MyProposals;
