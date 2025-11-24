import { globalStyles } from '@/Styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SearchBar from 'react-native-dynamic-search-bar';
import HomeHeader from '../Components/HomePage/HomeHeader';
import OrderCard from '../Components/HomePage/OrderCard';

const sortOptions = [
  'Most Recent',
  'Oldest First',
  'Price: High to Low',
  'Price: Low to High',
];

const { height, width } = Dimensions.get('window');

const Order = () => {
  const [selectedOption, setSelectedOption] = useState('Most Recent');
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
    setDropdownVisible(false);
    // Trigger sorting logic here (e.g., API fetch or list sort)
  };

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: '#f9fafb' }]}>
      <HomeHeader title="Orders" orders />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#f9fafb' }}>


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
          placeholder="Search orders"
          clearIconComponent
          onPress={() => alert('onPress')}
        />

        <View style={{ marginTop: height * 0.02, width: width * 0.9, marginHorizontal: width * 0.05, }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              // paddingHorizontal: 16,
              alignItems: 'center'

            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '500' }}>4 Orders Found</Text>
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
        </View>


        <OrderCard
          orderId="ORD-7829"
          orderDate="May 1, 2025"
          status="Cancelled"
          productName="Italian Carrara Marble"
          quantity={25}
          unitPrice={85}
          total={2125}
          estimatedDelivery="May 5, 2025"
          productImage="https://i.ibb.co/z7ZYYkg/marble.png"
          onPressViewDetails={() => alert('Viewing Details')}
        />

        <OrderCard
          orderId="ORD-7829"
          orderDate="May 1, 2025"
          status="In Transit"
          productName="Italian Carrara Marble"
          quantity={25}
          unitPrice={85}
          total={2125}
          estimatedDelivery="May 5, 2025"
          productImage="https://i.ibb.co/z7ZYYkg/marble.png"
          onPressViewDetails={() => alert('Viewing Details')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Order;

const styles = StyleSheet.create({
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
