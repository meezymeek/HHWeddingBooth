# Sound Effects Setup

This directory should contain the following audio files for the photo booth:

## Required Files

### 1. beep.mp3
- **Purpose**: Countdown timer beep (played each second)
- **Duration**: 100-200ms
- **Format**: MP3
- **Characteristics**: Short, pleasant beep sound

### 2. shutter.mp3
- **Purpose**: Camera shutter sound (played when photo is captured)
- **Duration**: 200-300ms
- **Format**: MP3
- **Characteristics**: Classic camera shutter/click sound

## Where to Find Free Sound Effects

### Recommended Sources (Free & Royalty-Free)

1. **Freesound.org** (https://freesound.org/)
   - Search: "countdown beep" or "timer beep"
   - Search: "camera shutter" or "camera click"
   - Requires free account
   - Filter by: Creative Commons 0 (CC0) for no attribution required

2. **Mixkit** (https://mixkit.co/free-sound-effects/)
   - Browse: UI Sound Effects
   - Look for: Button clicks, beeps, camera sounds
   - No account required
   - All sounds are free for commercial use

3. **Zapsplat** (https://www.zapsplat.com/)
   - Search: "beep" and "camera"
   - Free account required
   - Free sounds available with attribution

4. **Pixabay** (https://pixabay.com/sound-effects/)
   - Search: "beep" and "camera shutter"
   - No account required
   - Royalty-free

## Quick Setup (Recommended)

1. Visit https://mixkit.co/free-sound-effects/click/
2. Download a short UI beep sound → rename to `beep.mp3`
3. Visit https://mixkit.co/free-sound-effects/camera/
4. Download a camera shutter sound → rename to `shutter.mp3`
5. Place both files in this directory

## Temporary Testing Without Audio

The app will work without these files - it just won't play sounds. The visual feedback (countdown numbers, flash effect) will still work perfectly.

## Current Status

- [ ] beep.mp3 - Not yet added
- [ ] shutter.mp3 - Not yet added
