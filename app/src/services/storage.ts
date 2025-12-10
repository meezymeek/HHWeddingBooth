import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base photos path from env or default
const PHOTOS_BASE_PATH = process.env.PHOTOS_PATH || join(__dirname, '../../../data/photos');

/**
 * Initialize storage directories
 */
export function initializeStorage(): void {
  if (!existsSync(PHOTOS_BASE_PATH)) {
    mkdirSync(PHOTOS_BASE_PATH, { recursive: true });
    console.log('✅ Storage directory created');
  }
}

/**
 * Get the directory structure for a user's photos
 */
export function getUserPhotoDir(slug: string): {
  base: string;
  original: string;
  web: string;
  thumb: string;
  strips: string;
} {
  const base = join(PHOTOS_BASE_PATH, slug);
  
  return {
    base,
    original: join(base, 'original'),
    web: join(base, 'web'),
    thumb: join(base, 'thumb'),
    strips: join(base, 'strips'),
  };
}

/**
 * Ensure user's photo directories exist
 */
export function ensureUserDirectories(slug: string): void {
  const dirs = getUserPhotoDir(slug);
  
  for (const dir of Object.values(dirs)) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Save a file to the storage system
 */
export function saveFile(filepath: string, data: Buffer): void {
  const dir = dirname(filepath);
  
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  writeFileSync(filepath, data);
}

/**
 * Read a file from the storage system
 */
export function readFile(filepath: string): Buffer {
  return readFileSync(filepath);
}

/**
 * Delete a file from the storage system
 */
export function deleteFile(filepath: string): void {
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filepath: string): boolean {
  return existsSync(filepath);
}

/**
 * Get full path for a photo file
 */
export function getPhotoPath(slug: string, type: 'original' | 'web' | 'thumb' | 'strips', filename: string): string {
  const dirs = getUserPhotoDir(slug);
  return join(dirs[type], filename);
}

/**
 * Get web-accessible photo URL
 */
export function getPhotoUrl(slug: string, type: 'original' | 'web' | 'thumb' | 'strips', filename: string): string {
  return `/photos/${slug}/${type}/${filename}`;
}

// Initialize storage on module load
initializeStorage();
