import { create } from 'zustand';
import API from '../services/api.js';
import toast from 'react-hot-toast';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('mediconnect_user')) || null,
  profile: null,
  loading: false,
  authChecking: true,
  error: null,

  login: async (email, password, role) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post('/auth/login', { email, password, role });
      const { user, profile } = res.data;
      
      localStorage.setItem('mediconnect_user', JSON.stringify(user));
      set({ user, profile, loading: false });
      toast.success(`Welcome back, ${user.name}!`);
      return { success: true, user };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed';
      set({ loading: false, error: errMsg });
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  },

  register: async (formData) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ loading: false });
      toast.success(res.data.message || 'Registration successful! Check verification email.');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Registration failed';
      set({ loading: false, error: errMsg });
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  },

  logout: async () => {
    try {
      await API.get('/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      localStorage.removeItem('mediconnect_user');
      set({ user: null, profile: null });
      toast.success('Logged out successfully');
    }
  },

  checkAuth: async () => {
    // Only show global spinner if user session is not loaded in memory yet
    if (!get().user) {
      set({ authChecking: true });
    }
    try {
      const res = await API.get('/auth/me');
      set({ user: res.data.user, profile: res.data.profile, authChecking: false });
    } catch (err) {
      localStorage.removeItem('mediconnect_user');
      set({ user: null, profile: null, authChecking: false });
    }
  },

  updateProfile: async (formData, role) => {
    set({ loading: true });
    try {
      const endpoint = role === 'doctor' ? '/doctor/profile' : '/patient/profile';
      const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
      
      const res = await API.put(endpoint, formData, { headers });
      set({ profile: res.data.data, loading: false });
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Update failed';
      set({ loading: false });
      toast.error(errMsg);
      return { success: false, error: errMsg };
    }
  },

  // Patient Sub-actions
  uploadRecord: async (formData) => {
    try {
      const res = await API.post('/patient/records', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set((state) => ({
        profile: { ...state.profile, medicalRecords: res.data.data },
      }));
      toast.success('Medical record uploaded');
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Upload failed';
      toast.error(errMsg);
      return { success: false };
    }
  },

  deleteRecord: async (recordId) => {
    try {
      const res = await API.delete(`/patient/records/${recordId}`);
      set((state) => ({
        profile: { ...state.profile, medicalRecords: res.data.data },
      }));
      toast.success('Medical record deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  },

  addReminder: async (reminder) => {
    try {
      const res = await API.post('/patient/reminders', reminder);
      set((state) => ({
        profile: { ...state.profile, medicineReminders: res.data.data },
      }));
      toast.success('Reminder added');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add reminder');
      return { success: false };
    }
  },

  deleteReminder: async (reminderId) => {
    try {
      const res = await API.delete(`/patient/reminders/${reminderId}`);
      set((state) => ({
        profile: { ...state.profile, medicineReminders: res.data.data },
      }));
      toast.success('Reminder removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete reminder');
    }
  },

  toggleFav: async (doctorId) => {
    try {
      const res = await API.post(`/patient/favourites/${doctorId}`);
      set((state) => ({
        profile: { ...state.profile, favouriteDoctors: res.data.data },
      }));
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to update favourites');
    }
  },
}));
