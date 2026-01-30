const express = require('express');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');
const redirectRoute = require('./routes/redirect');
const identityMiddleware = require('./middleware/identity');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(identityMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Public dashboard (cookie-scoped, no auth)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Admin dashboard (client-side auth check via sessionStorage token)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
