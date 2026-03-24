/**
 * Image upload processing for ezyDraw.
 *
 * Handles validation, HEIC conversion, orientation, and resize/compress
 * so uploaded images are ready for the canvas and database.
 */

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

const HEIC_EXTENSIONS = new Set(['heic', 'heif']);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Validate that a file is an acceptable image type and within size limits.
 * iOS sometimes sends empty MIME for HEIC, so we fall back to extension check.
 */
export function validateImageFile(file: File): ValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isHeic = HEIC_EXTENSIONS.has(extension);

  // Accept if MIME matches, or if extension indicates HEIC (iOS sends empty MIME)
  if (!ALLOWED_MIME_TYPES.has(file.type) && !isHeic) {
    return { valid: false, error: 'Unsupported file type. Please use JPEG, PNG, WebP, GIF, HEIC, or AVIF.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum is 20MB.` };
  }

  return { valid: true };
}

/**
 * Check if a file is HEIC/HEIF format (by MIME or extension).
 */
function isHeicFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return file.type === 'image/heic' || file.type === 'image/heif' || HEIC_EXTENSIONS.has(ext);
}

/**
 * Process an image file for upload to the canvas.
 *
 * Pipeline:
 * 1. HEIC → JPEG conversion via heic-to (lazy-loaded, uses libheif 1.21.2)
 * 2. createImageBitmap — auto-handles EXIF orientation, strips metadata
 * 3. Fit-contain resize within maxWidth × maxHeight (never upscale)
 * 4. Export as WebP at 0.85 quality
 *
 * Returns a WebP Blob typically 50-200KB.
 */
export async function processImageForUpload(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
): Promise<Blob> {
  let blob: Blob = file;

  // Step 1: Convert HEIC/HEIF to JPEG via heic-to (libheif 1.21.2)
  if (isHeicFile(file)) {
    try {
      const { heicTo } = await import('heic-to');
      blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
    } catch (err) {
      // heic-to failed — try native decode (Safari can handle HEIC natively)
      console.warn('HEIC conversion failed, falling back to native decode:', err);
    }
  }

  // Step 2: Decode — createImageBitmap auto-rotates EXIF and strips metadata
  const bitmap = await createImageBitmap(blob);
  const origW = bitmap.width;
  const origH = bitmap.height;

  // Step 3: Fit-contain scale (never upscale)
  const scale = Math.min(1, maxWidth / origW, maxHeight / origH);
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  // Step 4: Draw to canvas and export as WebP
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetW, targetH);
    ctx = canvas.getContext('2d');
  } else {
    // Fallback for older Safari
    const el = document.createElement('canvas');
    el.width = targetW;
    el.height = targetH;
    canvas = el;
    ctx = el.getContext('2d');
  }

  if (!ctx) throw new Error('Could not create canvas context');

  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // Export
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
  }

  // Fallback: HTMLCanvasElement.toBlob
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/webp',
      0.85,
    );
  });
}
