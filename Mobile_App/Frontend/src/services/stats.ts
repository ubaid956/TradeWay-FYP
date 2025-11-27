import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '@/src/config/api';

export const statsService = {
  async getVendorStats() {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.get(
      `${apiConfig.baseURL}/stats/vendor`,
      { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  },
  async getBuyerStats() {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.get(
      `${apiConfig.baseURL}/stats/buyer`,
      { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  }
};
