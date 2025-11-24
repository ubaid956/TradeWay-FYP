import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

const OrderCard = (props) => {
  const {
    orderId,
    orderDate,
    status,
    productName,
    quantity,
    unitPrice,
    total,
    estimatedDelivery,
    productImage,
    onPressViewDetails,
  } = props;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.orderId}>{orderId}</Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>🚚 {status}</Text>
        </View>
      </View>

      <Text style={styles.date}>{orderDate}</Text>

      <View style={styles.productContainer}>
        <Image source={{ uri: productImage }} style={styles.image} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.quantity}>Qty: {quantity}</Text>
        </View>
        <Text style={styles.price}>${unitPrice.toFixed(2)} per unit</Text>
      </View>

      <View style={styles.progressLabels}>
        <Text style={styles.label}>Order Placed</Text>
        <Text style={styles.label}>Estimated Delivery: {estimatedDelivery}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={styles.progress} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.total}>
          Total: <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </Text>
        <TouchableOpacity style={styles.button} onPress={onPressViewDetails}>
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 12,
    width: width * 0.9,
    elevation: 3,
    marginHorizontal: width * 0.05, 
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderId: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBox: {
    backgroundColor: '#e0edff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 12,
  },
  date: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productName: {
    fontWeight: '600',
    fontSize: 15,
  },
  quantity: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
  },
  price: {
    fontWeight: '600',
    fontSize: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: '#888',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 6,
    marginTop: 6,
    overflow: 'hidden',
  },
  progress: {
    width: '70%',
    height: 6,
    backgroundColor: '#2563EB',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  total: {
    fontSize: 14,
    color: '#444',
  },
  totalAmount: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
