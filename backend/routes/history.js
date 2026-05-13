const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const FILE = path.join(__dirname, '../data/history.json');

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeHistory(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Get history
router.get('/history', (req, res) => {
  res.json(readHistory());
});

// Save a lookup to history
router.post('/history', (req, res) => {
  const { ip, city, country, countryCode, threat } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP required' });

  const history = readHistory();
  const exists = history.find(h => h.ip === ip);
  if (!exists) {
    history.unshift({ ip, city, country, countryCode, threat, time: new Date().toISOString() });
    if (history.length > 20) history.pop(); // keep last 20
    writeHistory(history);
  }
  res.json({ success: true });
});

// Clear history
router.delete('/history', (req, res) => {
  writeHistory([]);
  res.json({ success: true });
});

module.exports = router;