# PWA Icons Required

## Icon Specifications

To make the PWA installable, create the following icons:

### Required Icons

1. **icon-192.png** (192x192 pixels)
   - Standard PWA icon
   - Should be the wedding logo or a camera/photo booth icon
   - PNG format with transparent or wedding-themed background

2. **icon-512.png** (512x512 pixels)
   - High-resolution PWA icon
   - Same design as 192x192, just larger
   - PNG format

3. **icon-maskable.png** (512x512 pixels)
   - Safe zone: 80% of canvas (410x410 centered)
   - Important content must be within safe zone
   - Can bleed to edges for background
   - Used for Android adaptive icons

## Design Recommendations

### Theme
- Background: Dark navy (#000814) or starry pattern matching app
- Icon: White camera/photo booth symbol or "H&H" monogram
- Style: Elegant, wedding-themed

### Tools
- Use online tool: https://maskable.app/ to test maskable icon
- Or use Figma/Photoshop with 512x512 canvas

### Quick Solution
If you don't have design tools:
1. Use a free icon generator: https://favicon.io/favicon-generator/
2. Or temporarily use placeholder icons from https://placeholder.com/

## Temporary Workaround

For testing, you can:
1. Create solid color placeholders with text
2. Or use the app without icons (PWA will still work, just won't show icon in installer)

## Installation

Once icons are created, place them in this directory:
- `frontend/static/icons/icon-192.png`
- `frontend/static/icons/icon-512.png`
- `frontend/static/icons/icon-maskable.png`

The vite.config.js is already configured to reference these icons.
