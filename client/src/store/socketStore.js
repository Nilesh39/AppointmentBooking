import { create } from 'zustand';
import { io } from 'socket.io-client';
import API from '../services/api.js';
import toast from 'react-hot-toast';

export const useSocketStore = create((set, get) => ({
  socket: null,
  messages: [],
  contacts: [],
  notifications: [],
  activeContact: null,

  connectSocket: (userId) => {
    if (get().socket) return;

    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    socket.emit('join', userId);

    socket.on('receive_message', (msg) => {
      const active = get().activeContact;
      // If message belongs to current active chat, append it
      if (active && (msg.senderId === active || msg.receiverId === active)) {
        set((state) => ({ messages: [...state.messages, msg] }));
      }
    });

    socket.on('new_notification', (notif) => {
      toast(notif.message, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#334155',
          color: '#fff',
        },
      });
      get().fetchNotifications();
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  setActiveContact: (contact) => {
    set({ activeContact: contact ? contact._id : null, messages: [] });
    if (contact) {
      get().fetchHistory(contact._id);
    }
  },

  fetchHistory: async (otherUserId) => {
    try {
      const res = await API.get(`/chat/history/${otherUserId}`);
      set({ messages: res.data.data });
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  },

  fetchContacts: async () => {
    try {
      const res = await API.get('/chat/contacts');
      set({ contacts: res.data.data });
    } catch (err) {
      console.error('Failed to fetch chat contacts:', err);
    }
  },

  sendLiveMessage: async (receiverId, content) => {
    try {
      // 1. Save to DB
      await API.post('/chat/message', { receiverId, content });
      
      // 2. Emit to socket for real-time delivery
      const socket = get().socket;
      const sender = JSON.parse(localStorage.getItem('mediconnect_user'));
      if (socket && sender) {
        socket.emit('send_message', {
          senderId: sender._id,
          receiverId,
          content,
        });
      }
      
      // Trigger a contact refresh to sort or update lists
      get().fetchContacts();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Message could not be sent.');
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await API.get('/notifications');
      set({ notifications: res.data.data });
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  },

  markAsRead: async (notifId) => {
    try {
      await API.put(`/notifications/${notifId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notifId ? { ...n, isRead: true } : n
        ),
      }));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await API.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      }));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  },
}));
