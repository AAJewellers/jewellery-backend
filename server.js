const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const admin = require('firebase-admin');

// ✅ Render-এ Environment Variable থেকে Service Account JSON পড়ুন
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Firebase Service Account loaded from Environment Variable');
  } else {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Firebase Service Account loaded from file');
  }
} catch (error) {
  console.error('❌ Failed to load Firebase Service Account:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

console.log('✅ Firebase Admin initialized successfully');

// Initialize Express
const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://aa-jewellery.web.app',
    'https://aa-jewellery.firebaseapp.com',
    process.env.FRONTEND_URL || 'https://jewellery-frontend.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ⭐ GLOBAL TIMEOUT MIDDLEWARE
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error('⏰ Request timeout:', req.method, req.url);
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Gateway Timeout'
      });
    }
  });
  next();
});

// ============================================
// ✅ ROUTES - সঠিক অর্ডারে import করুন
// ============================================
const shippingRoutes = require('./routes/shipping');
const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhook');
const returnRoutes = require('./routes/returnAPI');
const emailRoutes = require('./routes/email'); // ✅ আগে import করুন

// ============================================
// ✅ USE ROUTES
// ============================================
app.use('/api/shipping', shippingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/email', emailRoutes); // ✅ এখন ব্যবহার করুন

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AA Jewellery API Gateway is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Route ${req.method} ${req.url} not found` 
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({ 
    success: false, 
    error: err.message || 'Internal Server Error' 
  });
});

// Start Server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔥 Firebase Admin: ✅ Active`);
  console.log(`🧪 Test: http://localhost:${PORT}/health`);
});
