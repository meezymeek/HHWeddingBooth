import sharp from 'sharp';
import { getPhotoPath, saveFile } from './storage.js';

/**
 * Processed image paths
 */
export interface ProcessedImage {
  original: string;
  web: string;
  thumb: string;
}

/**
 * Process an uploaded photo into multiple sizes
 */
export async function processPhoto(
  inputBuffer: Buffer,
  slug: string,
  photoId: string
): Promise<ProcessedImage> {
  const filename = `${photoId}.jpg`;
  
  const paths = {
    original: getPhotoPath(slug, 'original', filename),
    web: getPhotoPath(slug, 'web', filename),
    thumb: getPhotoPath(slug, 'thumb', filename),
  };
  
  // Save original (no processing)
  saveFile(paths.original, inputBuffer);
  
  // Web version (resized, compressed)
  const webBuffer = await sharp(inputBuffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  
  saveFile(paths.web, webBuffer);
  
  // Thumbnail
  const thumbBuffer = await sharp(inputBuffer)
    .resize(400, 400, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  saveFile(paths.thumb, thumbBuffer);
  
  return paths;
}

/**
 * Strip generation options
 */
export interface StripOptions {
  photoWidth: number;      // Width of each photo in strip
  padding: number;         // Outer padding
  gap: number;             // Gap between photos
  backgroundColor: string; // Strip background color
}

const DEFAULT_STRIP_OPTIONS: StripOptions = {
  photoWidth: 600,
  padding: 20,
  gap: 10,
  backgroundColor: '#ffffff',
};

/**
 * Generate a photo strip from multiple photos
 */
export async function generateStrip(
  photoPaths: string[],
  outputPath: string,
  options: Partial<StripOptions> = {}
): Promise<void> {
  const opts = { ...DEFAULT_STRIP_OPTIONS, ...options };
  const photoHeight = Math.round(opts.photoWidth * 0.75); // 4:3 aspect
  
  // Calculate total dimensions
  const totalWidth = opts.photoWidth + (opts.padding * 2);
  const totalHeight = 
    (opts.padding * 2) + 
    (photoHeight * photoPaths.length) + 
    (opts.gap * (photoPaths.length - 1)) +
    80; // Extra space for future overlay zone
  
  // Resize all photos to consistent size
  const resizedPhotos = await Promise.all(
    photoPaths.map(async (photoPath, i) => ({
      input: await sharp(photoPath)
        .resize(opts.photoWidth, photoHeight, { fit: 'cover' })
        .toBuffer(),
      top: opts.padding + (i * (photoHeight + opts.gap)),
      left: opts.padding,
    }))
  );
  
  // Create strip canvas and composite photos
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: opts.backgroundColor,
    },
  })
    .composite(resizedPhotos)
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

/**
 * Get image metadata
 */
export async function getImageMetadata(filepath: string): Promise<sharp.Metadata> {
  return await sharp(filepath).metadata();
}
