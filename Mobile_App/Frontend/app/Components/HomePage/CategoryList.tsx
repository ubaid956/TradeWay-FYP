import React from 'react';
import { Dimensions, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const CategoryList = ({ categories, selectedCategory, onCategoryPress }) => {
  return (
    <View  style={{ height: height * 0.12, marginBottom: 0}}>

   
    <FlatList
      horizontal
      style={{  height: height * 0.13 }}
      data={categories}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={{ paddingHorizontal: 10 }}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => {
      const isSelected = selectedCategory === item.id;

        return (
          <TouchableOpacity
            onPress={() => onCategoryPress(item.id)}
            style={{ alignItems: 'center', marginHorizontal: width * 0.02 }}
          >
            <View
              style={{
                borderRadius: 40,
                padding: 4,
                borderWidth: isSelected ? 2 : 0,
                borderColor: isSelected ? '#007bff' : 'transparent',
              }}
            >
              <Image
                source={item.icon}
                style={{
                  width: width * 0.13,
                  height: width * 0.13,
                  borderRadius: 100,
                  backgroundColor: '#fff',
                }}
              />
            </View>
            <Text
              style={{
                marginTop: 5,
                color: isSelected ? '#007bff' : '#555',
                fontWeight: isSelected ? 'bold' : 'normal',
                fontSize: 13,
              }}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
     </View>
  );
};

export default CategoryList;
