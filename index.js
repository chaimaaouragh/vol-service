const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const lastLocations = {};
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'change_me_token';

app.use((req, res, next) => {
  if (req.method === 'GET' && req.path === '/health') return next();
  const header = req.headers['authorization'];
  if (!header || header !== `Bearer ${AUTH_TOKEN}`) return res.status(401).json({ error: 'unauthorized' });
  next();
});

app.put('/volunteers/:id/location', (req, res) => {
  const id = req.params.id;
  const { lat, lon, accuracy, ts } = req.body || {};
  const now = new Date().toISOString();
  lastLocations[id] = { lat, lon, accuracy, ts: ts || now, received_at: now };
  console.log('Location update', id, lastLocations[id]);
  res.json({ status: 'ok', id, data: lastLocations[id] });
});

app.get('/volunteers/:id/location', (req, res) => {
  const id = req.params.id;
  if (!lastLocations[id]) return res.status(404).json({ error: 'not found' });
  res.json({ id, data: lastLocations[id] });
});

app.get('/health', (req, res) => res.send('ok'));

const port = process.env.PORT || 3000;
app.listen(port,'0.0.0.0', () => console.log(`Vol-service listening on ${port}`));

