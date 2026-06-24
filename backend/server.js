import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Configuration
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorMiddleware.js';

// Routes imports
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io integration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Map to track active user socket connections
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Register user ID with socket
  socket.on('join', (userId) => {
    if (userId) {
      userSockets.set(userId.toString(), socket.id);
      console.log(`User joined: ${userId} -> Socket: ${socket.id}`);
    }
  });

  // Handle live chat sending
  socket.on('send_message', ({ senderId, receiverId, content }) => {
    console.log(`Socket message from ${senderId} to ${receiverId}: ${content}`);
    const receiverSocketId = userSockets.get(receiverId?.toString());
    
    // Broadcast back to sender for optimistic ui / verification
    socket.emit('receive_message', { senderId, receiverId, content, createdAt: new Date() });

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', {
        senderId,
        receiverId,
        content,
        createdAt: new Date(),
      });
      
      // Also send a live notification alert
      io.to(receiverSocketId).emit('new_notification', {
        title: 'New Chat Message',
        message: 'You have received a new direct message.',
      });
    }
  });

  // WebRTC Video Call Signaling Events
  socket.on('join_call', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined call room: ${room}`);
    socket.to(room).emit('user_joined_call', socket.id);
  });

  socket.on('webrtc_offer', ({ room, offer }) => {
    socket.to(room).emit('webrtc_offer', offer);
  });

  socket.on('webrtc_answer', ({ room, answer }) => {
    socket.to(room).emit('webrtc_answer', answer);
  });

  socket.on('webrtc_ice_candidate', ({ room, candidate }) => {
    socket.to(room).emit('webrtc_ice_candidate', candidate);
  });

  socket.on('leave_call', (room) => {
    console.log(`Socket ${socket.id} leaving call room: ${room}`);
    socket.to(room).emit('user_left_call');
    socket.leave(room);
  });

  // Handle sudden disconnection - notify any active video call rooms before socket leaves
  socket.on('disconnecting', () => {
    console.log(`Socket disconnecting (pre-cleanup): ${socket.id}`);
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('user_left_call');
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Expose Socket.io to request contexts so we can send live updates from controllers
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  next();
});

// Security & Request Parsing Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allows displaying static images locally
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Directories
app.use(express.static('public'));

// Create public paths dynamically if they don't exist
const dirs = ['public/temp', 'public/uploads', 'public/documents'];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Root Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'MediConnect API server is running smoothly.',
  });
});

// Centralized Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
