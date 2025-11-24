import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,

} from "react-native";
import React, { useEffect } from "react";
import { globalStyles } from "@/Styles/globalStyles";
import CustomButton from "../Components/CustomButton";
import InputField from "../Components/InputFiled";
import { Formik } from "formik";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import '../../google-signin.config';

import * as yup from "yup";
import { useRouter } from "expo-router";

import Divider from "../Components/Divider";

// Redux imports
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginUser, googleLoginUser, clearError } from "../store/slices/authSlice";

// import axios from 'axios' // Removed as we're using Redux now
const { height, width } = Dimensions.get("window");

const loginSchema = yup.object({
    email: yup.string().email().required("Email is required"),
    password: yup
        .string()
        .min(6, "Password must be at least 6 characters long")
        .required("Password is required"),
});

const Login = () => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);

    // Redirect to main app if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, router]);

    // Redux state
    const { error, user } = useAppSelector(state => state.auth);

    // Clear error on component mount
    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    // Navigate to tabs if authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            router.push("/(tabs)");
        }
    }, [isAuthenticated, user, router]);

    const handleGoogleSignIn = async () => {
        try {
            // Ensure play services are available (Android)
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in and get user info and idToken
            await GoogleSignin.signIn();
            // getTokens returns idToken and accessToken (if available)
            const tokens = await GoogleSignin.getTokens();
            const { idToken, accessToken } = tokens || {};

            // Use Firebase to create credential and sign in
            if (idToken || accessToken) {
                const credential = auth.GoogleAuthProvider.credential(idToken, accessToken);
                const firebaseUser = await auth().signInWithCredential(credential);

                // Get Firebase ID token for your server
                const firebaseIdToken = await firebaseUser.user.getIdToken();
                console.log('Firebase Google sign-in successful, Firebase ID token:', firebaseIdToken);
                getUserProfile(firebaseIdToken);
            } else {
                console.warn('No token returned from Google Signin');
                Alert.alert('Google Sign-in Error', 'No token received from Google.');
            }
        } catch (error) {
            console.error('Google Signin Error:', error);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Play Services Not Available', 'Google Play Services is not available or outdated.');
            } else {
                Alert.alert('Google Sign-in Error', error.message || 'Failed to sign in with Google.');
            }
        }
    };

    const getUserProfile = async (token) => {
        try {
            console.log('Starting Google login process with Redux...');

            // Use Redux action for Google login
            await dispatch(googleLoginUser(token));

            console.log('✅ Google login successful - Redux state updated');
        } catch (error) {
            console.error('Google sign-in failed:', error);
            Alert.alert('Login Failed', error.message || 'Failed to sign in with Google. Please try again.');
        }
    };

    const handleSignIn = async (values) => {
        try {
            // Use Redux action for login
            await dispatch(loginUser({
                email: values.email,
                password: values.password,
            })).unwrap();

            // Success - navigation will be handled by useEffect
            console.log('Login successful via Redux');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(
                'Login Failed',
                error || 'Invalid email or password',
                [{ text: 'OK' }]
            );
        }
    };



    return (
        <ScrollView style={globalStyles.container}>
            <KeyboardAvoidingView
                style={globalStyles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -150} // Adjust offset if needed
            >
                <Image source={require('../../assets/images/Splash/splash_blue.png')} style={[globalStyles.image, {
                    marginTop: height * 0.09, alignSelf: 'center'

                }]} resizeMode='contain' />

                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View >

                        <Text style={globalStyles.title}>Sign In</Text>
                        <Formik
                            initialValues={{ email: "", password: "" }}
                            validationSchema={loginSchema}
                            onSubmit={(values) => {
                                handleSignIn(values);
                            }}
                        >
                            {(props) => (
                                <View >
                                    <InputField
                                        placeholder="Email Address"
                                        icon="mail"
                                        value={props.values.email}
                                        onChangeText={props.handleChange("email")}
                                        onBlur={props.handleBlur("email")}
                                    />
                                    <Text style={globalStyles.error}>
                                        {props.touched.email && props.errors.email}
                                    </Text>
                                    <InputField
                                        placeholder="Password"
                                        icon="lock-closed"
                                        isPassword
                                        value={props.values.password}
                                        onChangeText={props.handleChange("password")}
                                        onBlur={props.handleBlur("password")}
                                    />


                                    <Text style={globalStyles.error}>
                                        {props.touched.password && props.errors.password}
                                    </Text>

                                    {/* Display Redux error */}
                                    {error && (
                                        <Text style={globalStyles.error}>
                                            {error}
                                        </Text>
                                    )}

                                    {/* navigation.navigate('Signup-Login/ForgotPassword') */}
                                    <TouchableOpacity onPress={() => router.push("/Signup-Login/ForgotPassword")}>
                                        <Text style={globalStyles.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                    <CustomButton
                                        title={
                                            isLoading ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                "Sign In"
                                            )
                                        }
                                        onPress={props.handleSubmit}
                                        disabled={isLoading}
                                    />

                                </View>
                            )}
                        </Formik>



                    </View>
                </TouchableWithoutFeedback>

                <View style={styles.continueContainer}>
                    <Divider />
                    <Text style={[styles.signUpText]}>
                        or Continue With
                    </Text>
                    <Divider />
                </View>
                <View style={globalStyles.lower_cont}>

                    <TouchableOpacity onPress={() => {
                        console.log('Google sign-in button pressed');
                        handleGoogleSignIn();
                    }}>
                        <Image
                            source={require("../../assets/images/LoginSignup/google.png")}
                            style={styles.icon}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Image
                            source={require("../../assets/images/LoginSignup/facebook.png")}
                            style={styles.icon}
                        />
                    </TouchableOpacity>

                </View>
                <TouchableOpacity style={globalStyles.lower_cont}>


                    <Text>
                        Don&apos;t have an Account?{" "}

                    </Text>
                    <Text
                        // navigation.navigate("Signup-Login/Signup")
                        style={globalStyles.forgotText}
                        onPress={() => router.push("/Signup-Login/Signup")}
                    >
                        Sign Up
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>




        </ScrollView>
    );
};

const styles = StyleSheet.create({


    continueContainer: {
        display: 'flex',
        flexDirection: 'row',
        // backgroundColor: 'lightblue',

        width: width * 0.85,
        marginHorizontal: width * 0.08,
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: height * 0.03
    },

    signUpText: {
        textAlign: "center",

    },

    icon: {
        width: width * 0.12,
        height: width * 0.12, // Make height equal to width
        borderRadius: (width * 0.12) / 2, // Half of width for perfect circle
        marginHorizontal: width * 0.04,
    },
});

export default Login;
