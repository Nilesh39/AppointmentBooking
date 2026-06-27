import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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

// ═══════════════════════════════════════════════════
// 🔒 CLOUDFLARE & PROXY TRUST CONFIGURATION
// ═══════════════════════════════════════════════════
// Trust Cloudflare's proxy headers (CF-Connecting-IP, X-Forwarded-For)
// This ensures rate limiting uses the real client IP, not Cloudflare's IP
app.set('trust proxy', 1);

// Helper for dynamic CORS origin resolution in development
const getCorsOrigin = (origin, callback) => {
  // Allow requests with no origin (like mobile apps, curl, postman)
  if (!origin) return callback(null, true);

  if (process.env.NODE_ENV === 'development') {
    return callback(null, true);
  }

  const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

// Socket.io integration
const io = new Server(server, {
  cors: {
    origin: getCorsOrigin,
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

// ═══════════════════════════════════════════════════
// 🛡️ SECURITY MIDDLEWARES
// ═══════════════════════════════════════════════════

// Helmet — Sets various HTTP security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allows displaying static images locally
    contentSecurityPolicy: false, // Let Cloudflare handle CSP
  })
);

// Additional Security Headers (complements Cloudflare)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Remove server fingerprint
  res.removeHeader('X-Powered-By');
  next();
});

// CORS
app.use(
  cors({
    origin: getCorsOrigin,
    credentials: true,
  })
);

// Request Size Limits — Prevents large payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ═══════════════════════════════════════════════════
// 🚦 RATE LIMITING (Works with Cloudflare Proxy)
// ═══════════════════════════════════════════════════

// General API rate limiter — 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  // Use Cloudflare's real IP header
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

// Strict Auth rate limiter — 20 requests per 15 minutes (login, register, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

// Payment rate limiter — 10 requests per 15 minutes
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please try again after 15 minutes.',
  },
  keyGenerator: (req) => {
    return req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  },
});

// Serve Static Directories
app.use(express.static('public'));

// Create public paths dynamically if they don't exist
const dirs = ['public/temp', 'public/uploads', 'public/documents'];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ═══════════════════════════════════════════════════
// 📡 MOUNT API ROUTES WITH RATE LIMITERS
// ═══════════════════════════════════════════════════
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient', apiLimiter, patientRoutes);
app.use('/api/doctor', apiLimiter, doctorRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/appointments', apiLimiter, appointmentRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);

// Root Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'MediConnect API server is running smoothly.',
    cloudflare: req.headers['cf-connecting-ip'] ? 'proxied' : 'direct',
  });
});

// Centralized Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`🛡️  Security: Helmet + Rate Limiting + CORS active`);
  console.log(`☁️  Cloudflare proxy trust: enabled`);
});
