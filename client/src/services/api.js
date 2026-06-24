import axios from 'axios';
import toast from 'react-hot-toast';

export const BACKEND_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : `${window.location.protocol}//${window.location.hostname}:5000`;

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true, // Enables cookie storage
});

// Response interceptor to handle errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    
    // Auto logout if unauthorized (session expired)
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('mediconnect_user');
      
      // Dynamically clear Zustand auth store to update UI immediately
      import('../store/authStore.js')
        .then(({ useAuthStore }) => {
          useAuthStore.setState({ user: null, profile: null });
        })
        .catch((err) => console.error('Interceptor failed to clear auth store:', err));

      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    
    return Promise.reject(error);
  }
);

export default API;
