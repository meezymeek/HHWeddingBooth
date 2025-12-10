/**
 * Generate a device fingerprint for user identification
 * Uses browser features to create a unique identifier
 */
export async function generateFingerprint(): Promise<string> {
	const components: string[] = [];

	// Screen resolution
	components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

	// Timezone
	components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

	// Language
	components.push(navigator.language);

	// Platform
	components.push(navigator.platform);

	// User agent
	components.push(navigator.userAgent);

	// Hardware concurrency (CPU cores)
	components.push(String(navigator.hardwareConcurrency || 0));

	// Device memory (if available)
	components.push(String((navigator as any).deviceMemory || 0));

	// Touch support
	components.push(String('ontouchstart' in window));

	// Canvas fingerprint
	try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.textBaseline = 'top';
			ctx.font = '14px Arial';
			ctx.fillStyle = '#f60';
			ctx.fillRect(0, 0, 140, 20);
			ctx.fillStyle = '#069';
			ctx.fillText('Haven&Hayden2025', 2, 2);
			components.push(canvas.toDataURL());
		}
	} catch (e) {
		components.push('canvas-error');
	}

	// Combine and hash
	const combined = components.join('|');
	return await hashString(combined);
}

/**
 * Simple hash function for fingerprinting
 */
async function hashString(str: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(str);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return hashHex;
}
