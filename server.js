const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Store word/Phrase progress in memory (auto-saves to JSON)
const DATA_FILE = path.join(__dirname, 'data.json');

let db = { users: {}, wordProgress: {}, favorites: [], stats: { totalPlays: 0 } };

// Load existing data if available
try {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('data.json load failed, starting fresh');
}

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('saveDb error:', e.message);
  }
}

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ API Routes ============

// Get user progress
app.get('/api/progress/:userId', (req, res) => {
  const pid = req.params.userId;
  const data = db.wordProgress[pid] || { count: 0, items: {} };
  res.json({ userId: pid, ...data, favorites: db.favorites || [], stats: db.stats });
});

// Update user progress
app.post('/api/progress/:userId', (req, res) => {
  const pid = req.params.userId;
  if (!db.wordProgress[pid]) db.wordProgress[pid] = { count: 0, items: {} };
  const { item, action } = req.body; // action: 'played', 'favorite', 'unfavorite'

  if (item) {
    if (!db.wordProgress[pid].items[item]) {
      db.wordProgress[pid].items[item] = { played: 0, favorited: false };
    }
    if (action === 'played') {
      db.wordProgress[pid].items[item].played++;
      db.wordProgress[pid].count++;
      db.stats.totalPlays++;
    } else if (action === 'favorite') {
      db.wordProgress[pid].items[item].favorited = true;
      if (!db.favorites.includes(item)) db.favorites.push(item);
    } else if (action === 'unfavorite') {
      db.wordProgress[pid].items[item].favorited = false;
      db.favorites = db.favorites.filter(f => f !== item);
    }
  }

  saveDb();
  const data = db.wordProgress[pid];
  res.json({ userId: pid, ...data, favorites: db.favorites, stats: db.stats });
});

// Get favorites
app.get('/api/favorites', (req, res) => {
  res.json({ favorites: db.favorites || [] });
});

// Get global stats
app.get('/api/stats', (req, res) => {
  res.json(db.stats);
});

// === Fallback to index.html for SPA ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ EnglishVibe 服务器已启动`);
  console.log(`   ➜ 本地: http://localhost:${PORT}`);
  console.log(`   ➜ 局域网: http://<本机IP>:${PORT}`);
});
