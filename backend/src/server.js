// backend/src/server.js

require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const compression   = require('compression');
const rateLimit     = require('express-rate-limit');
const routes        = require('./routes');
const vectorStore   = require('./services/vectorStore');
const errorHandler  = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting on all /api routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100             // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parsing (JSON & URL-encoded) + compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Mount all API routes under /api
app.use('/api', routes);

// Fallback health-check at root
app.get('/', (req, res) => {
  res.send('TriPilot Real Estate Backend is running.');
});

// Error handler
app.use(errorHandler);

// Initialize services (e.g. Pinecone) and start the server
async function startServer() {
  try {
    await vectorStore.initialize();
    console.log('✅ Vector store initialized');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
