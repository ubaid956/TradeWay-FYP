import { globalStyles } from "@/Styles/globalStyles";
import { Formik } from "formik";
import React, { useEffect } from "react";

import {
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View, ActivityIndicator
} from "react-native";
import * as Yup from "yup";
import CustomButton from "../Components/CustomButton";
import InputField from "../Components/InputFiled";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from 'expo-router';

// Redux imports
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { registerUser, clearError } from "@/src/store/slices/authSlice";

const { height } = Dimensions.get("window");

const SignupSchema = Yup.object().shape({
    fullName: Yup.string().required("Full name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    phoneNumber: Yup.string()
        .test('phone-length', 'Phone number too short', (value) => {
            // Remove country code for validation
            const numberWithoutCode = value?.replace(/^\+92/, '') || '';
            return numberWithoutCode.length >= 10;
        })
        .required("Phone number is required"),
    password: Yup.string()
        .min(6, "Password too short")
        .required("Password is required"),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords do not match")
        .required("Confirm Password is required"),
    role: Yup.string().required("Role is required"),
});

const SignUpScreen = () => {
    const navigation = useNavigation();
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Redux state
    const { isLoading, error, isAuthenticated, user } = useAppSelector(state => state.auth);

    // Clear error on component mount
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    // Navigate to tabs if authenticated (after successful registration)
    useEffect(() => {
        if (isAuthenticated && user) {
            router.push("/(tabs)");
        }
    }, [isAuthenticated, user, router]);

    const handleSubmit = async (values, { resetForm }) => {
        try {
            // Use Redux action for registration
            await dispatch(registerUser({
                name: values.fullName,
                email: values.email,
                password: values.password,
                phone: values.phoneNumber,
                role: values.role,
            })).unwrap();

            // Success - show alert and reset form
            Alert.alert("Success", "Account Created Successfully!");
            resetForm();

            // Navigation will be handled automatically by useEffect
            // when isAuthenticated becomes true
            console.log('Registration successful - user will be auto-navigated to main app');
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert("Error", error || "Something went wrong. Please try again.");
        }
    };




    return (
        <KeyboardAvoidingView
            style={globalStyles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 40}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, }}
                    keyboardShouldPersistTaps="handled"
                    style={globalStyles.container}
                    showsVerticalScrollIndicator={false}
                >
                    <View >
                        <Image source={require('../../assets/images/Splash/splash_blue.png')} style={[globalStyles.image, {
                            marginTop: height * 0.09, alignSelf: 'center'

                        }]} resizeMode='contain' />

                        <Text style={globalStyles.title}>Create Account</Text>
                    </View>

                    <Formik
                        initialValues={{
                            fullName: "",
                            email: "",
                            phoneNumber: "",
                            password: "",
                            confirmPassword: "",
                            role: "",
                        }}
                        validationSchema={SignupSchema}
                        onSubmit={handleSubmit}
                    >
                        {({
                            values,
                            errors,
                            touched,
                            handleChange,
                            handleBlur,
                            handleSubmit,
                            setFieldValue,
                        }) => (
                            <>
                                <InputField
                                    placeholder="Full Name"
                                    icon="person"
                                    value={values.fullName}
                                    onChangeText={handleChange("fullName")}
                                    onBlur={handleBlur("fullName")}
                                />
                                {touched.fullName && errors.fullName && (
                                    <Text style={globalStyles.error}>{errors.fullName}</Text>
                                )}

                                <InputField
                                    placeholder="Email"
                                    icon="mail"
                                    value={values.email}
                                    onChangeText={handleChange("email")}
                                    onBlur={handleBlur("email")}
                                />
                                {touched.email && errors.email && (
                                    <Text style={globalStyles.error}>{errors.email}</Text>
                                )}

                                <InputField
                                    placeholder="Phone Number"
                                    isPhone
                                    value={values.phoneNumber}
                                    onChangeText={handleChange("phoneNumber")}
                                    onBlur={handleBlur("phoneNumber")}
                                />
                                {touched.phoneNumber && errors.phoneNumber && (
                                    <Text style={globalStyles.error}>{errors.phoneNumber}</Text>
                                )}

                                <InputField
                                    placeholder="Password"
                                    icon="lock-closed"
                                    isPassword
                                    value={values.password}
                                    onChangeText={handleChange("password")}
                                    onBlur={handleBlur("password")}
                                />
                                {touched.password && errors.password && (
                                    <Text style={globalStyles.error}>{errors.password}</Text>
                                )}
                                <Text style={globalStyles.msgText}>
                                    Password must be at least 6 characters with letters and numbers
                                </Text>

                                <InputField
                                    placeholder="Confirm Password"
                                    icon="lock-closed"
                                    isPassword
                                    value={values.confirmPassword}
                                    onChangeText={handleChange("confirmPassword")}
                                    onBlur={handleBlur("confirmPassword")}
                                />
                                {touched.confirmPassword && errors.confirmPassword && (
                                    <Text style={globalStyles.error}>{errors.confirmPassword}</Text>
                                )}

                                <InputField
                                    placeholder="Select Role"
                                    icon="people"
                                    isDropdown
                                    dropdownItems={[
                                        { label: "Vender", value: "vendor" },
                                        { label: "Driver", value: "driver" },
                                        { label: "Buyer", value: "buyer" },
                                    ]}
                                    value={values.role}
                                    onChangeText={(val) => setFieldValue("role", val)}
                                    onBlur={handleBlur("role")}
                                />
                                {touched.role && errors.role && (
                                    <Text style={globalStyles.error}>{errors.role}</Text>
                                )}

                                {/* Display Redux error */}
                                {error && (
                                    <Text style={globalStyles.error}>
                                        {error}
                                    </Text>
                                )}

                                {/* <View style={{ marginVertical: height * 0.01 }}>
                                    <CustomButton title="Sign In" onPress={handleSubmit} />
                                </View> */}
                                <CustomButton
                                    title={
                                        isLoading ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            "Sign up"
                                        )
                                    }
                                    onPress={handleSubmit}
                                    disabled={isLoading}
                                />

                            </>
                        )}
                    </Formik>

                    <TouchableOpacity style={[{ alignItems: "center", marginBottom: height * 0.07 }]} onPress={() => router.back()}>
                        <Text>
                            Already have an account?{" "}
                            <Text style={globalStyles.forgotText}>Log in</Text>
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default SignUpScreen;
