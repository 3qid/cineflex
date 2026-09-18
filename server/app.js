const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const { sequelize, testDbConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const { search, tvDetails, tvSeries } = require('./controllers/SearchController');

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.get('/api/search', search);
app.get('/api/tv/:id', tvDetails);
app.get('/api/tvseries', tvSeries);

// Test Route
app.get('/api', (req, res) => {
  res.json({ message: 'CineFlex Server is live!' });
});

// Serve built client (production) with SPA fallback
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

async function startServer() {
  try {
    await testDbConnection();

    if (process.env.NODE_ENV === 'production') {
      await sequelize.sync();
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('✅ [Database Status]: All models and associations synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 [Server Running]: Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ [Database Error]:', error.message);
  }
}

startServer();