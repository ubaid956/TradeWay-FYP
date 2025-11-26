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
    Modal,
    TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/src/store/hooks';
import { apiService } from '@/src/services/apiService';
import CustomHeader from '../Components/Profile_Components/CustomHeader';
import CustomButton from '../Components/CustomButton';
import { globalStyles } from '@/Styles/globalStyles';
import { formatCurrency } from '@/src/utils/currency';

const { width, height } = Dimensions.get('window');

type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

type CounterActor = 'buyer' | 'vendor';

interface CounterEntry {
    actor: CounterActor;
    bidAmount: number;
    quantity: number;
    message?: string;
    createdAt?: string;
}

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
        shipping?: {
            shippingCost?: number;
        };
    };
    bidAmount: number;
    quantity: number;
    message?: string;
    status: ProposalStatus;
    createdAt: string;
    awaitingAction?: CounterActor;
    counterHistory?: CounterEntry[];
    agreement?: {
        amount?: number;
        quantity?: number;
        confirmedAt?: string;
    };
    sellerResponse?: {
        message?: string;
        respondedAt?: string;
    };
    invoice?: {
        _id: string;
        invoiceNumber: string;
        status: 'sent' | 'paid' | 'cancelled';
        totalAmount: number;
        subtotal?: number;
        shippingCost?: number;
        paymentIntentId?: string;
        paidAt?: string;
    };
    order?: {
        _id: string;
        orderNumber: string;
        status: string;
        orderDate: string;
    } | null;
}

const statusColors = {
    pending: { bg: '#FEF3C7', text: '#92400E', icon: 'schedule' },
    accepted: { bg: '#D1FAE5', text: '#065F46', icon: 'check-circle' },
    rejected: { bg: '#FEE2E2', text: '#991B1B', icon: 'cancel' },
    withdrawn: { bg: '#E5E7EB', text: '#6B7280', icon: 'remove-circle' },
};

const formatActorLabel = (actor?: CounterActor) => {
    if (!actor) return 'Buyer';
    return actor === 'vendor' ? 'You' : 'Buyer';
};

const VendorProposals = () => {
    const { token, user } = useAppSelector(state => state.auth);
    
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<ProposalStatus | 'all'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [activeCounterProposal, setActiveCounterProposal] = useState<Proposal | null>(null);
    const [counterAmount, setCounterAmount] = useState('');
    const [counterQuantity, setCounterQuantity] = useState('');
    const [counterMessage, setCounterMessage] = useState('');
    const [counterSubmitting, setCounterSubmitting] = useState(false);
    const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

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

    const handleSendInvoice = (proposal: Proposal) => {
        const unitPrice = proposal.agreement?.amount || proposal.bidAmount;
        const quantity = proposal.agreement?.quantity || proposal.quantity;
        const shippingCost = proposal.product?.shipping?.shippingCost || 0;
        const totalAmount = unitPrice * quantity + shippingCost;

        Alert.alert(
            'Send Invoice',
            `Send an invoice of ${formatPrice(totalAmount)} to ${proposal.bidder.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        try {
                            setSendingInvoiceId(proposal._id);
                            const response = await apiService.invoices.sendInvoice(proposal._id);
                            if (!response.success) {
                                throw new Error(response.error || 'Failed to send invoice');
                            }

                            Alert.alert('Invoice sent', 'The buyer has been notified.');
                            fetchProposals(filter === 'all' ? undefined : filter);
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to send invoice');
                        } finally {
                            setSendingInvoiceId(null);
                        }
                    },
                },
            ]
        );
    };

    const openCounterModal = (proposal: Proposal) => {
        const history = proposal.counterHistory || [];
        const lastEntry = history.length ? history[history.length - 1] : null;
        setActiveCounterProposal(proposal);
        setCounterAmount((lastEntry?.bidAmount || proposal.bidAmount).toString());
        setCounterQuantity((lastEntry?.quantity || proposal.quantity).toString());
        setCounterMessage('');
        setShowCounterModal(true);
    };

    const closeCounterModal = () => {
        setShowCounterModal(false);
        setActiveCounterProposal(null);
        setCounterAmount('');
        setCounterQuantity('');
        setCounterMessage('');
        setCounterSubmitting(false);
    };

    const submitCounterOffer = async () => {
        if (!activeCounterProposal) return;
        if (!counterAmount || !counterQuantity) {
            Alert.alert('Missing fields', 'Please provide both amount and quantity for the counter offer.');
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
            const response = await apiService.bids.counterOffer(activeCounterProposal._id, {
                bidAmount: amount,
                quantity: qty,
                message: counterMessage,
            });

            if (response.success) {
                Alert.alert('Counter sent', 'Your counter offer has been shared with the buyer.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            closeCounterModal();
                            fetchProposals(filter === 'all' ? undefined : filter);
                        }
                    }
                ]);
            } else {
                throw new Error(response.error || 'Failed to send counter offer');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send counter offer');
        } finally {
            setCounterSubmitting(false);
        }
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

                                {proposal.awaitingAction && proposal.status === 'pending' && (
                                    <Text style={styles.awaitingText}>
                                        {proposal.awaitingAction === 'vendor'
                                            ? 'Awaiting your response'
                                            : 'Waiting for buyer response'}
                                    </Text>
                                )}

                                {proposal.agreement && proposal.status === 'accepted' && (
                                    <View style={styles.agreementBanner}>
                                        <Text style={styles.agreementTitle}>Agreed Terms</Text>
                                        <Text style={styles.agreementText}>
                                            {formatPrice(proposal.agreement.amount || proposal.bidAmount)} ·
                                            Qty {proposal.agreement.quantity || proposal.quantity}
                                        </Text>
                                        {proposal.order && (
                                            <Text style={styles.orderInfoText}>
                                                Order #{proposal.order.orderNumber} • {proposal.order.status}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {proposal.counterHistory && proposal.counterHistory.length > 1 && (
                                    <View style={styles.historyContainer}>
                                        <Text style={styles.sectionTitle}>Negotiation History</Text>
                                        {proposal.counterHistory.map((entry, idx) => (
                                            <View key={`${proposal._id}-history-${idx}`} style={styles.historyRow}>
                                                <View style={styles.historyBadge}>
                                                    <Text style={styles.historyBadgeText}>
                                                        {formatActorLabel(entry.actor)}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.historyAmount}>{formatPrice(entry.bidAmount)}</Text>
                                                    <Text style={styles.historyMeta}>
                                                        Qty {entry.quantity}
                                                        {entry.createdAt
                                                            ? ` • ${formatDate(entry.createdAt)}`
                                                            : ''}
                                                    </Text>
                                                    {entry.message ? (
                                                        <Text style={styles.historyMessage}>{entry.message}</Text>
                                                    ) : null}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Actions */}
                                {proposal.status === 'pending' && (
                                    <View style={styles.actionsContainer}>
                                        <CustomButton
                                            title={isProcessing ? 'Processing...' : 'Accept'}
                                            onPress={() => handleAccept(proposal)}
                                            disabled={isProcessing}
                                            small
                                            style={{ flex: 1 }}
                                        />
                                        <View style={{ width: 10 }} />
                                        <CustomButton
                                            title={isProcessing ? 'Processing...' : 'Reject'}
                                            onPress={() => handleReject(proposal)}
                                            disabled={isProcessing}
                                            small
                                            login
                                            style={{ flex: 1 }}
                                        />
                                    </View>
                                )}

                                {proposal.status === 'pending' && proposal.awaitingAction === 'vendor' && (
                                    <TouchableOpacity
                                        style={styles.secondaryAction}
                                        onPress={() => openCounterModal(proposal)}
                                    >
                                        <Text style={styles.secondaryActionText}>Send Counter Offer</Text>
                                    </TouchableOpacity>
                                )}

                                {proposal.status === 'accepted' && (
                                    <View style={styles.invoiceSection}>
                                        {!proposal.invoice ? (
                                            <TouchableOpacity
                                                style={[
                                                    styles.secondaryAction,
                                                    sendingInvoiceId === proposal._id && styles.disabledAction,
                                                ]}
                                                onPress={() => handleSendInvoice(proposal)}
                                                disabled={sendingInvoiceId === proposal._id}
                                            >
                                                <Text
                                                    style={[
                                                        styles.secondaryActionText,
                                                        sendingInvoiceId === proposal._id && styles.disabledActionText,
                                                    ]}
                                                >
                                                    {sendingInvoiceId === proposal._id ? 'Sending…' : 'Send Invoice'}
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={styles.invoiceStatusCard}>
                                                <Text style={styles.invoiceStatusTitle}>
                                                    {proposal.invoice.invoiceNumber || 'Invoice'}
                                                </Text>
                                                <Text style={styles.invoiceStatusAmount}>
                                                    {formatPrice(proposal.invoice.totalAmount)}
                                                </Text>
                                                <Text
                                                    style={[styles.invoiceStatusLabel, proposal.invoice.status === 'paid' ? styles.invoiceStatusPaid : styles.invoiceStatusPending]}
                                                >
                                                    {proposal.invoice.status === 'paid' ? 'Paid' : 'Awaiting payment'}
                                                </Text>
                                            </View>
                                        )}
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

                                {proposal.status === 'accepted' && (
                                    <TouchableOpacity
                                        style={styles.secondaryAction}
                                        onPress={() => {
                                            const params: any = {
                                                productId: proposal.product._id,
                                                buyerId: proposal.bidder._id,
                                                bidId: proposal._id,
                                            };
                                            
                                            // Automatically include orderId if available
                                            if (proposal.order?._id) {
                                                params.orderId = proposal.order._id;
                                            }
                                            
                                            router.push({
                                                pathname: '/VendorScreens/CreateCargo',
                                                params,
                                            });
                                        }}
                                    >
                                        <Text style={styles.secondaryActionText}>Create Cargo Job</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <Modal
                visible={showCounterModal}
                transparent
                animationType="slide"
                onRequestClose={closeCounterModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Counter Offer</Text>
                        <Text style={styles.modalSubtitle}>
                            {activeCounterProposal?.bidder.name}
                        </Text>

                        <Text style={styles.modalLabel}>Offer Amount</Text>
                        <TextInput
                            value={counterAmount}
                            onChangeText={setCounterAmount}
                            keyboardType="numeric"
                            placeholder="Enter counter amount"
                            style={styles.modalInput}
                        />

                        <Text style={styles.modalLabel}>Quantity</Text>
                        <TextInput
                            value={counterQuantity}
                            onChangeText={setCounterQuantity}
                            keyboardType="numeric"
                            placeholder="Quantity"
                            style={styles.modalInput}
                        />

                        <Text style={styles.modalLabel}>Message (optional)</Text>
                        <TextInput
                            value={counterMessage}
                            onChangeText={setCounterMessage}
                            placeholder="Add a short note"
                            style={[styles.modalInput, { height: 90 }]}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={closeCounterModal}
                                disabled={counterSubmitting}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalPrimaryButton]}
                                onPress={submitCounterOffer}
                                disabled={counterSubmitting}
                            >
                                <Text style={styles.modalPrimaryText}>
                                    {counterSubmitting ? 'Sending…' : 'Send Counter'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default VendorProposals;
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
        textAlign: 'center',
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
        marginTop: 8,
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        color: '#6b7280',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    messageContainer: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
    },
    messageLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
    dateText: {
        marginTop: 10,
        fontSize: 12,
        color: '#6b7280',
    },
    awaitingText: {
        marginTop: 10,
        color: '#92400E',
        fontWeight: '500',
    },
    agreementBanner: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#ECFDF5',
    },
    agreementTitle: {
        fontWeight: '600',
        fontSize: 14,
        color: '#065F46',
    },
    agreementText: {
        marginTop: 4,
        color: '#047857',
    },
    historyContainer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    historyRow: {
        flexDirection: 'row',
        gap: 12,
    },
    historyBadge: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    historyBadgeText: {
        color: '#3730A3',
        fontSize: 12,
        fontWeight: '600',
    },
    historyAmount: {
        fontWeight: '700',
        color: '#111827',
    },
    historyMeta: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    historyMessage: {
        fontSize: 13,
        color: '#374151',
        marginTop: 4,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 16,
    },
    secondaryAction: {
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    secondaryActionText: {
        color: '#0758C2',
        fontWeight: '600',
    },
    disabledAction: {
        opacity: 0.6,
    },
    disabledActionText: {
        color: '#9ca3af',
    },
    invoiceSection: {
        marginTop: 12,
        gap: 8,
    },
    invoiceStatusCard: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#F9FAFB',
        gap: 4,
    },
    invoiceStatusTitle: {
        fontWeight: '600',
        color: '#111827',
    },
    invoiceStatusAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2563EB',
    },
    invoiceStatusLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    invoiceStatusPaid: {
        color: '#047857',
    },
    invoiceStatusPending: {
        color: '#92400E',
    },
    responseContainer: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    responseLabel: {
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    responseText: {
        color: '#374151',
        fontSize: 13,
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
        color: '#111827',
    },
    modalSubtitle: {
        color: '#6b7280',
        marginBottom: 16,
    },
    modalLabel: {
        color: '#4b5563',
        fontWeight: '600',
        marginTop: 10,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        padding: 12,
        marginTop: 6,
        fontSize: 15,
        backgroundColor: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
    },
    modalCancelButton: {
        backgroundColor: '#f3f4f6',
    },
    modalPrimaryButton: {
        backgroundColor: '#0758C2',
    },
    modalCancelText: {
        color: '#4b5563',
        fontWeight: '600',
    },
    modalPrimaryText: {
        color: '#fff',
        fontWeight: '600',
    },
    orderInfoText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
});

