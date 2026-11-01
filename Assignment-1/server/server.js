// server.js
// Main entry point for WatchSpace AI Backend (Node.js, Express.js, MongoDB, Socket.io)
const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');

// 1. Load environment variables
dotenv.config();

// 2. Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

// 3. Initialize Express app
const app = express();
const server = http.createServer(app);

// 4. Setup Middlewares
app.use(cors({
  origin: '*', // Allow frontend requests
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads/subtitles', express.static(path.join(__dirname, 'uploads', 'subtitles'), {
  dotfiles: 'deny',
  fallthrough: false,
  setHeaders: (res) => res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
}));
app.use('/uploads/movies', express.static(path.join(__dirname, 'uploads', 'movies'), {
  dotfiles: 'deny',
  fallthrough: false
}));

// 5. Setup Socket.io for Real-time Synchronization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

const { initSocket } = require('./services/socketService');
initSocket(io);

// 6. Base & Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'WatchSpace AI Backend',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// 7. Mount Application API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/spaces', require('./routes/spaceRoutes'));
app.use('/api/timeline', require('./routes/timelineRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/interactions', require('./routes/interactionRoutes'));

// PRD Section 7.3 exact specification routes
app.use('/api/v1', require('./routes/v1Routes'));


// 8. Error Handling Middlewares
const { notFound, errorHandler } = require('./middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// 9. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 WatchSpace AI Backend running on port ${PORT}`);
  console.log(`📡 REST API Base: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSockets (Socket.io): Ready on port ${PORT}`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});
