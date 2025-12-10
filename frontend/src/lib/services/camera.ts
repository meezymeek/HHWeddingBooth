/**
 * Camera service for handling media stream access
 */

let currentStream: MediaStream | null = null;

/**
 * Start camera and get media stream
 */
export async function startCamera(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
	try {
		// Stop any existing stream first
		if (currentStream) {
			stopCamera();
		}

		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode,
				width: { ideal: 1920 },
				height: { ideal: 1080 }
			},
			audio: false
		});

		currentStream = stream;
		return stream;
	} catch (error) {
		console.error('Error accessing camera:', error);
		throw new Error('Unable to access camera. Please grant camera permissions.');
	}
}

/**
 * Stop camera and release stream
 */
export function stopCamera(): void {
	if (currentStream) {
		currentStream.getTracks().forEach(track => track.stop());
		currentStream = null;
	}
}

/**
 * Capture photo from video element
 */
export function capturePhoto(
	videoElement: HTMLVideoElement,
	mirror: boolean = true
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		try {
			const canvas = document.createElement('canvas');
			canvas.width = videoElement.videoWidth;
			canvas.height = videoElement.videoHeight;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Failed to get canvas context'));
				return;
			}

			// Mirror the image if needed (for front camera)
			if (mirror) {
				ctx.scale(-1, 1);
				ctx.drawImage(videoElement, -canvas.width, 0, canvas.width, canvas.height);
			} else {
				ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
			}

			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to create blob'));
					}
				},
				'image/jpeg',
				0.95
			);
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Check if camera is supported
 */
export function isCameraSupported(): boolean {
	return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
