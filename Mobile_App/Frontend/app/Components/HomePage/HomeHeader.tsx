import { globalStyles } from '@/Styles/globalStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Dimensions, Text, View, TouchableOpacity } from 'react-native';
import SearchBar from "react-native-dynamic-search-bar";
import OrderTabs from './OrdersTabs';

const { height, width } = Dimensions.get("window");

const HomeHeader = ({ title, placeholder, orders, profile }) => {
    const [searchText, setSearchText] = useState('');
    const [spinnerVisibility, setSpinnerVisibility] = useState(false);

    const handleOnChangeText = (text) => {
        setSearchText(text);
        setSpinnerVisibility(true);

        setTimeout(() => {
            setSpinnerVisibility(false);
        }, 500);
    };

    const filterList = (text) => {
        setSearchText(text);
    };

    return (
        <View style={globalStyles.homeHeader}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignContent: 'center', marginBottom: height * 0.02 }}>
                <Text style={{
                    color: 'white',
                    fontSize: width * 0.05,
                    fontWeight: "700",
                    marginLeft: width * 0.03
                }}>{title}</Text>

                {profile ? (
                    // Show settings icon on profile screen
                    <TouchableOpacity
                        onPress={() => alert('Settings pressed')}
                        style={{ marginRight: 20 }}
                    >
                        <Ionicons name="settings" size={25} color="white" />
                    </TouchableOpacity>
                ) : !orders && (
                    // Show notifications and cart icons when NOT profile and NOT orders
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 20, width: width * 0.15, padding: 2, borderRadius: 10 }}>
                        <TouchableOpacity onPress={() => router.push('/Notifications')}>
                            <Ionicons name="notifications" size={24} color="white" />

                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/Cart')}>
                            <Ionicons name='cart' size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {!profile && !orders && (
                <SearchBar
                    value={searchText}
                    fontColor="#c6c6c6"
                    iconColor="#c6c6c6"
                    shadowColor="#282828"
                    cancelIconColor="#c6c6c6"
                    backgroundColor="white"
                    placeholder={placeholder}
                    spinnerVisibility={spinnerVisibility}
                    onChangeText={handleOnChangeText}
                    onSearchPress={() => console.log("Search Icon is pressed")}
                    onClearPress={() => filterList("")}
                    onPress={() => alert("onPress")}
                />
            )}

            {orders && !profile && <OrderTabs />}
        </View>
    );
};

export default HomeHeader;
