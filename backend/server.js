const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import configurations and middleware
const { connectDB } = require('./config/database');
const { responseHandler } = require('./middleware/responseHandler');
const { performanceMonitor } = require('./middleware/performanceMonitor');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Configure CORS properly
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000', 
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      'https://localhost:8080',
      'https://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now during development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
};

app.use(cors(corsOptions));

// Middleware setup
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

// Custom middleware
app.use(responseHandler);
app.use(performanceMonitor);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/experts', require('./routes/expertRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/scheduled-sanctuary', require('./routes/scheduledSanctuaryRoutes'));
app.use('/api/live-sanctuary', require('./routes/liveSanctuaryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/elevenlabs', require('./routes/elevenLabsRoutes'));

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: corsOptions.origin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io handler
socketHandler(io);

// Connect to MongoDB
connectDB();

// Central error handling
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message || 'An unexpected error occurred',
    data: null
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Expose app and io for testing or other modules
module.exports = { app, io };
