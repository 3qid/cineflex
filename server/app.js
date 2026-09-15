const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const { sequelize, testDbConnection } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { search, tvDetails, tvSeries } = require('./controllers/SearchController');

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.get('/api/search', search);
app.get('/api/tv/:id', tvDetails);
app.get('/api/tvseries', tvSeries);

// Test Route
app.get('/', (req, res) => {
  res.json({ message: 'CineFlex Server is live!' });
});



async function startServer() {
  try {
    await testDbConnection();

    await sequelize.sync({ alter: true });
    console.log('✅ [Database Status]: All models and associations synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 [Server Running]: Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ [Database Error]:', error.message);
  }
}

startServer();