import sharp from 'sharp';
import { getPhotoPath, saveFile } from './storage.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import TextToSVG from 'text-to-svg';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Great Vibes font file
const greatVibesFontPath = join(__dirname, '../../fonts/GreatVibes-Regular.ttf');
const textToSVG = TextToSVG.loadSync(greatVibesFontPath);

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
  gap: 20, // 2x spacing between photos
  backgroundColor: '#ffffff',
};

/**
 * Generate a photo strip from multiple photos
 */
export async function generateStrip(
  photoPaths: Array<{ path: string; facingMode?: string }>,
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
    photoHeight; // Extra space at bottom (size of one photo)
  
  // Create rounded corner mask SVG
  const cornerRadius = 8; // Match strip container radius
  const roundedRectSVG = `
    <svg width="${opts.photoWidth}" height="${photoHeight}">
      <rect x="0" y="0" width="${opts.photoWidth}" height="${photoHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>
  `;
  
  // Resize all photos to consistent size with rounded corners
  // Photos are already saved with correct orientation (mirrored for front camera)
  const resizedPhotos = await Promise.all(
    photoPaths.map(async (photoData, i) => {
      // Resize photo
      const resizedPhoto = await sharp(photoData.path)
        .resize(opts.photoWidth, photoHeight, { fit: 'cover' })
        .toBuffer();
      
      // Apply rounded corners using composite with mask
      const roundedPhoto = await sharp(resizedPhoto)
        .composite([{
          input: Buffer.from(roundedRectSVG),
          blend: 'dest-in'
        }])
        .toBuffer();
      
      return {
        input: roundedPhoto,
        top: opts.padding + (i * (photoHeight + opts.gap)),
        left: opts.padding,
      };
    })
  );
  
  // Create SVG text overlay for bottom section - centered vertically and horizontally
  const bottomAreaStart = opts.padding + (photoHeight * photoPaths.length) + (opts.gap * (photoPaths.length - 1));
  const bottomAreaHeight = photoHeight;
  const centerY = bottomAreaStart + (bottomAreaHeight / 2);
  
  // Scale all three text lines to specific widths
  // Line 1: Haven + Hayden - 90% width
  const line1TargetWidth = opts.photoWidth * 0.90;
  let line1FontSize = 94;
  let line1Metrics = textToSVG.getMetrics('Haven + Hayden', { fontSize: line1FontSize });
  line1FontSize = Math.round((line1TargetWidth / line1Metrics.width) * line1FontSize);
  line1Metrics = textToSVG.getMetrics('Haven + Hayden', { fontSize: line1FontSize });
  
  // Line 2: New Years Eve - 50% width
  const line2TargetWidth = opts.photoWidth * 0.50;
  const line2BaseSize = 83;
  // Estimate cursive text width (approximation since we don't have the font file)
  const line2FontSize = Math.round(line2BaseSize * (line2TargetWidth / (opts.photoWidth * 0.7)));
  
  // Line 3: 2025 - 40% width
  const line3TargetWidth = opts.photoWidth * 0.40;
  const line3BaseSize = 86;
  // Estimate Georgia text width (approximation)
  const line3FontSize = Math.round(line3BaseSize * (line3TargetWidth / (opts.photoWidth * 0.3)));
  
  // Calculate total text block height with equal spacing
  const line1Height = line1Metrics.height;
  const line2Height = line2FontSize; // Approximation
  const line3Height = line3FontSize; // Approximation
  const equalSpacing = 60; // Equal 60px spacing between all lines
  
  const totalTextBlockHeight = line1Height + equalSpacing + line2Height + equalSpacing + line3Height;
  
  // Start Y position to vertically center the entire text block
  const textBlockStartY = centerY - (totalTextBlockHeight / 2);
  
  // Calculate Y positions for each line
  const line1Y = textBlockStartY;
  const line2Y = line1Y + line1Height + equalSpacing;
  const line3Y = line2Y + line2Height + equalSpacing;
  
  // Generate SVG paths for "Haven + Hayden" using Great Vibes font with stroke for boldness
  const havenHaydenPath = textToSVG.getPath('Haven + Hayden', {
    x: 0,
    y: 0,
    fontSize: line1FontSize,
    anchor: 'left top',
    attributes: { 
      fill: '#000000',
      stroke: '#000000',
      'stroke-width': '2'
    }
  });
  
  // Calculate X position to center the text within the photo area
  const havenX = opts.padding + (opts.photoWidth / 2) - (line1Metrics.width / 2);
  
  // Add top margin above the text block
  const topMargin = 40;
  
  // Create complete SVG with all text elements - all lines scaled proportionally
  const textSvg = `
    <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
      <!-- Haven + Hayden in Great Vibes (90% width, bold with stroke) -->
      <g transform="translate(${havenX}, ${line1Y + topMargin})">
        ${havenHaydenPath}
      </g>
      <!-- New Years Eve in cursive (50% width) -->
      <text 
        x="${totalWidth / 2}" 
        y="${line2Y + topMargin}" 
        text-anchor="middle" 
        font-family="cursive" 
        font-size="${line2FontSize}" 
        font-style="italic"
        fill="#000000">New Year's Eve</text>
      <!-- 2025 in Georgia (40% width) -->
      <text 
        x="${totalWidth / 2}" 
        y="${line3Y + topMargin}" 
        text-anchor="middle" 
        font-family="Georgia, serif" 
        font-size="${line3FontSize}" 
        font-weight="600"
        fill="#000000">2025</text>
    </svg>
  `;

  // Create strip canvas, composite photos, and add text overlay
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 3,
      background: opts.backgroundColor,
    },
  })
    .composite([
      ...resizedPhotos,
      {
        input: Buffer.from(textSvg),
        top: 0,
        left: 0,
      }
    ])
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

/**
 * Get image metadata
 */
export async function getImageMetadata(filepath: string): Promise<sharp.Metadata> {
  return await sharp(filepath).metadata();
}
