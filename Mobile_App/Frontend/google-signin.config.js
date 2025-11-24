import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In for Firebase
GoogleSignin.configure({
    webClientId: '39658053351-fo2q62mg1406us85r7u1md6keq261rfj.apps.googleusercontent.com', // Required for offline access
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
});

export default GoogleSignin;
