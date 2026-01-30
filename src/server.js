const express = require('express');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');
const redirectRoute = require('./routes/redirect');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes (protected)
app.use('/api', apiRoutes);

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Redirect route — must be last
app.use('/', redirectRoute);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shrimp is running on port ${PORT}`);
});

module.exports = app;
