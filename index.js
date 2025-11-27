const express = require('express');
const Database = require('better-sqlite3');
const app = express();

const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'change_me_token';

// Base de données persistante
const db = new Database('./data/locations.db');

// Créer la table au démarrage
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    volunteer_id TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    accuracy REAL,
    ts TEXT,
    received_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.substring(7);
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'volunteer-location-tracker', timestamp: new Date().toISOString() });
});

// Sauvegarder dans SQLite
app.put('/volunteers/:id/location', authMiddleware, (req, res) => {
  const { lat, lon, accuracy, ts } = req.body;
  const volunteerId = req.params.id;

  // Validation
  if (lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO locations 
      (volunteer_id, lat, lon, accuracy, ts, received_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(volunteerId, lat, lon, accuracy || null, ts || null);

    console.log('Location saved:', volunteerId, { lat, lon });

    res.json({ 
      status: 'saved', 
      id: volunteerId,
      received_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

// Lire depuis SQLite
app.get('/volunteers/:id/location', authMiddleware, (req, res) => {
  const volunteerId = req.params.id;

  try {
    const row = db.prepare(`
      SELECT * FROM locations WHERE volunteer_id = ?
    `).get(volunteerId);

    if (!row) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json({
      id: row.volunteer_id,
      data: {
        lat: row.lat,
        lon: row.lon,
        accuracy: row.accuracy,
        ts: row.ts,
        received_at: row.received_at
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to retrieve location' });
  }
});

// Liste des bénévoles actifs (< 5 min)
app.get('/volunteers/active', authMiddleware, (req, res) => {
  try {
    const active = db.prepare(`
      SELECT volunteer_id, lat, lon, received_at
      FROM locations
      WHERE datetime(received_at) > datetime('now', '-5 minutes')
      ORDER BY received_at DESC
    `).all();

    res.json({
      count: active.length,
      volunteers: active
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to retrieve active volunteers' });
  }
});

// Statistiques du service
app.get('/stats', authMiddleware, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN datetime(received_at) > datetime('now', '-5 minutes') THEN 1 END) as active
      FROM locations
    `).get();

    res.json({
      total_volunteers: stats.total,
      active_now: stats.active,
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Volunteer Location Service running on port ${PORT}`);
  console.log(`Database: ${db.name}`);
});

// Fermer proprement la DB à l'arrêt
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
