/**
 * Sistem Informasi DAMAI - Express API Server
 * Yayasan Dhyana Pura — Universitas, LPK, PT Penyalur Tenaga Kerja
 * Dikembangkan oleh: Jatmiko Wahyu Nugroho
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/schema');

const app = express();
const PORT = process.env.PORT || 5000;

// FRONTEND_URL bisa berisi satu atau beberapa origin dipisah koma, contoh:
// FRONTEND_URL=https://damai-app.vercel.app,http://localhost:5173
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan request tanpa origin (curl, health check, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin tidak diizinkan oleh CORS: ' + origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      console.log(`${color}[${res.statusCode}]\x1b[0m ${req.method} ${req.path} (${ms}ms)`);
    });
    next();
  });
}

initializeDatabase();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/org', require('./routes/organization'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/periods', require('./routes/periods'));
app.use('/api/kpi', require('./routes/kpi'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok', timestamp: new Date().toISOString(), version: '3.0.0',
    developer: 'Jatmiko Wahyu Nugroho',
    app: 'Sistem Informasi DAMAI — Yayasan Dhyana Pura',
  });
});

app.use('/api/*', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan server internal' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏫 ══════════════════════════════════════`);
  console.log(`   Sistem Informasi DAMAI v3.0`);
  console.log(`   Yayasan Dhyana Pura`);
  console.log(`   Dev: Jatmiko Wahyu Nugroho`);
  console.log(`🚀 API Server: http://localhost:${PORT}`);
  console.log(`📊 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`══════════════════════════════════════\n`);
});

module.exports = app;
// Untuk Vercel serverless
module.exports = app;
