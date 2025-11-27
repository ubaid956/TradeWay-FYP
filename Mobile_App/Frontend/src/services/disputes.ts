import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiConfig } from '@/src/config/api';

export const disputesService = {
  async createDispute(orderId: string, reason: string) {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.post(
      `${apiConfig.baseURL}/disputes`,
      { orderId, reason },
      { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } }
    );
    return res.data.dispute;
  },
  async getMyDisputes() {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.get(
      `${apiConfig.baseURL}/disputes/my`,
      { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } }
    );
    return res.data.disputes;
  },
  async getDispute(id: string) {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.get(
      `${apiConfig.baseURL}/disputes/${id}`,
      { headers: { ...apiConfig.headers, Authorization: `Bearer ${token}` } }
    );
    return res.data.dispute;
  }
};
