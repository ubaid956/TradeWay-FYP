import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser } from '../store/slices/authSlice';

const LoginTestComponent = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector(state => state.auth);
  const [testCredentials, setTestCredentials] = useState({
    email: 'Hell@gmail.com',
    password: '000000'
  });

  const handleTestLogin = async () => {
    try {
      console.log('Testing login with credentials:', testCredentials);
      const result = await dispatch(loginUser(testCredentials)).unwrap();
      console.log('Login successful:', result);
      Alert.alert('Success', 'Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Error', error as string);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Test Component</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
        <Text style={styles.statusText}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
        {user && (
          <View>
            <Text style={styles.statusText}>User: {user.name}</Text>
            <Text style={styles.statusText}>Email: {user.email}</Text>
            <Text style={styles.statusText}>Role: {user.role}</Text>
            <Text style={styles.statusText}>ID: {user._id}</Text>
          </View>
        )}
        {error && <Text style={styles.errorText}>Error: {error}</Text>}
      </View>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleTestLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Test Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginTestComponent;
