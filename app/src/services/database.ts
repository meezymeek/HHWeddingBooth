import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path from env or default
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../../data/photobooth.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
export const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better concurrent access
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      email TEXT,
      device_fingerprint TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      photo_count INTEGER NOT NULL,
      strip_filename TEXT,
      settings TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create photos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      session_id TEXT REFERENCES sessions(id),
      filename_original TEXT NOT NULL,
      filename_web TEXT NOT NULL,
      filename_thumb TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      uploaded_at TEXT,
      is_synced INTEGER DEFAULT 0,
      sequence_number INTEGER
    )
  `);

  // Create config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
    CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
  `);

  // Insert default config values if not exists
  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)
  `);

  const defaultConfig = [
    ['countdown_initial', '3'],
    ['countdown_between', '1'],
    ['max_photos', '10'],
    ['mirror_preview', 'true'],
    ['overlay_enabled', 'false'],
    ['email_auto_send', 'false'],
    ['sound_enabled', 'true'],
  ];

  const insertMany = db.transaction((configs: [string, string][]) => {
    for (const config of configs) {
      insertConfig.run(config);
    }
  });

  insertMany(defaultConfig);

  console.log('✅ Database initialized successfully');
}

// Initialize database on module load
initializeDatabase();

/**
 * User database operations
 */
export const userQueries = {
  create: db.prepare(`
    INSERT INTO users (id, name, slug, email, device_fingerprint, created_at, last_active)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `),

  findBySlug: db.prepare(`
    SELECT * FROM users WHERE slug = ?
  `),

  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  findByDeviceFingerprint: db.prepare(`
    SELECT * FROM users WHERE device_fingerprint = ?
  `),

  updateLastActive: db.prepare(`
    UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?
  `),

  updateEmail: db.prepare(`
    UPDATE users SET email = ? WHERE id = ?
  `),

  getAll: db.prepare(`
    SELECT 
      u.*,
      COUNT(DISTINCT p.id) as photo_count,
      COUNT(DISTINCT s.id) as session_count
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id
    LEFT JOIN sessions s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY u.last_active DESC
  `),

  getWithPhotoCounts: db.prepare(`
    SELECT 
      u.*,
      COUNT(DISTINCT p.id) as photo_count,
      COUNT(DISTINCT s.id) as session_count
    FROM users u
    LEFT JOIN photos p ON u.id = p.user_id
    LEFT JOIN sessions s ON u.id = s.user_id
    WHERE u.slug = ?
    GROUP BY u.id
  `),
};

/**
 * Photo database operations
 */
export const photoQueries = {
  create: db.prepare(`
    INSERT INTO photos (
      id, user_id, session_id, filename_original, filename_web, 
      filename_thumb, captured_at, uploaded_at, is_synced, sequence_number
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?)
  `),

  findById: db.prepare(`
    SELECT * FROM photos WHERE id = ?
  `),

  findByUserId: db.prepare(`
    SELECT * FROM photos WHERE user_id = ? ORDER BY captured_at DESC LIMIT ? OFFSET ?
  `),

  findBySessionId: db.prepare(`
    SELECT * FROM photos WHERE session_id = ? ORDER BY sequence_number ASC
  `),

  countByUserId: db.prepare(`
    SELECT COUNT(*) as count FROM photos WHERE user_id = ?
  `),

  getAll: db.prepare(`
    SELECT 
      p.*,
      u.name as user_name,
      u.slug as user_slug
    FROM photos p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.captured_at DESC
    LIMIT ? OFFSET ?
  `),

  getAllCount: db.prepare(`
    SELECT COUNT(*) as count FROM photos
  `),
};

/**
 * Session database operations
 */
export const sessionQueries = {
  create: db.prepare(`
    INSERT INTO sessions (id, user_id, photo_count, settings, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),

  findById: db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `),

  findByUserId: db.prepare(`
    SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC
  `),

  updateStripFilename: db.prepare(`
    UPDATE sessions SET strip_filename = ? WHERE id = ?
  `),
};

/**
 * Config database operations
 */
export const configQueries = {
  get: db.prepare(`
    SELECT value FROM config WHERE key = ?
  `),

  set: db.prepare(`
    INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)
  `),

  getAll: db.prepare(`
    SELECT * FROM config
  `),
};

export default db;
