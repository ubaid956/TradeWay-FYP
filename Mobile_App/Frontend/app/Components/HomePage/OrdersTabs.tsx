import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const tabs = ['All Orders', 'Active', 'Completed', 'Cancelled'];

type Props = {
  activeTab?: string;
  onChange?: (tab: string) => void;
};

const OrderTabs: React.FC<Props> = ({ activeTab: controlledActive, onChange }) => {
  const [uncontrolledActive, setUncontrolledActive] = useState('All Orders');
  const activeTab = controlledActive ?? uncontrolledActive;

  const handlePress = (tab: string) => {
    if (onChange) onChange(tab);
    if (controlledActive === undefined) setUncontrolledActive(tab);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabButton, activeTab === tab && styles.activeTab]}
          onPress={() => handlePress(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default OrderTabs;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    // backgroundColor: '#2563eb', // Tailwind blue-600
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6', // Tailwind blue-500
    borderRadius: 10,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#fff',
    fontWeight: '600',
  },
  activeText: {
    color: '#2563eb',
  },
});
