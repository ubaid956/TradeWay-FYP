import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import {
    Dimensions,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const { height, width } = Dimensions.get("window");

const InputField = ({
    placeholder,
    icon,
    isPassword = false,
    isDropdown = false,
    dropdownItems = [],
    isPhone = false,
    value,
    onChangeText,
    onBlur,
    multiline = false,
    numberOfLines = 1,
    keyboardType = 'default',
    style,
}) => {
    const [isPasswordVisible, setPasswordVisible] = useState(false);
    const countryCode = "+92"; // Static country code

    if (isDropdown) {
        return (
            <View style={styles.inputContainer}>
                <Ionicons name={icon} size={20} color="#666" style={styles.icon} />
                <Picker
                    selectedValue={value}
                    style={styles.dropdown}
                    onValueChange={onChangeText}
                >
                    <Picker.Item label="Select Role" value="" />
                    {dropdownItems.map((item) => (
                        <Picker.Item key={item.value} label={item.label} value={item.value} />
                    ))}
                </Picker>
                <Ionicons name="chevron-down" size={20} color="#666" />
            </View>
        );
    }

    if (isPhone) {
        // Display only the number part (without country code)
        const displayValue = value ? value.replace(countryCode, "") : "";

        return (
            <View style={styles.inputContainer}>
                {/* Static country code display */}
                <View style={styles.codeWrapper}>
                    <Text style={styles.codeText}>{countryCode}</Text>
                </View>

                <TextInput
                    style={styles.phoneInput}
                    placeholder={placeholder}
                    placeholderTextColor="#888"
                    keyboardType="phone-pad"
                    value={displayValue}
                    onChangeText={(text) => {
                        // Always prepend country code
                        onChangeText?.(countryCode + text);
                    }}
                    onBlur={onBlur}
                />
            </View>
        );
    }

    return (
        <View style={[styles.inputContainer, style, multiline && { height: 100, alignItems: 'flex-start', paddingTop: 10 }]}>
            {icon && <Ionicons name={icon} size={20} color="#666" style={[styles.icon, multiline && { marginTop: 5 }]} />}
            <TextInput
                style={[styles.input, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 5 }]}
                placeholder={placeholder}
                placeholderTextColor="#888"
                secureTextEntry={isPassword && !isPasswordVisible}
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                multiline={multiline}
                numberOfLines={numberOfLines}
                keyboardType={keyboardType}
            />
            {isPassword && (
                <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)}>
                    <Ionicons
                        name={isPasswordVisible ? "eye-off" : "eye"}
                        size={20}
                        color="#666"
                        style={styles.icon}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

// Your original styles - completely unchanged
const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: "row",
        width: width * 0.85,
        alignItems: "center",
        backgroundColor: "#CFCECE",
        borderRadius: 10,
        paddingHorizontal: 10,
        alignSelf: "center",
        height: height * 0.062,
        marginVertical: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#000",
    },
    icon: {
        marginHorizontal: 5,
    },
    dropdown: {
        flex: 1,
        height: "100%",
        color: "#000",
    },
    codeWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderRightWidth: 1,
        borderRightColor: "#aaa",
        paddingHorizontal: 10,
        marginRight: 10,
    },
    codeText: {
        fontSize: 16,
        color: "#444",
        marginRight: 5,
    },
    phoneInput: {
        flex: 1,
        fontSize: 16,
        color: "#000",
    },
});

export default InputField;