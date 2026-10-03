const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const roleRedirects = {
  student: "student.html",
  institution: "institution.html",
  verifier: "verifier.html"
};

setTimeout(() => {
}, 500);
dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const credentialRoutes = require('./routes/credential.routes');
const verificationRoutes = require('./routes/verification.routes');

app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verification', verificationRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Blockchain Credential Verification API is running' });
});

// ── MongoDB Connection ──────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;