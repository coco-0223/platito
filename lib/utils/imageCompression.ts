export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1 MB (1024 * 1024)
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface CompressionResult {
  file: File | Blob;
  sizeBytes: number;
  dataUrl: string;
  compressed: boolean;
}

export function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Error al leer el archivo como Data URL'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada.'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Fallo al exportar el canvas a Blob.'));
      },
      type,
      quality
    );
  });
}

export async function validateAndCompressImage(
  file: File,
  maxSize: number = MAX_IMAGE_SIZE_BYTES
): Promise<CompressionResult> {
  // 1. Validate file existence and emptiness
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo.');
  }
  if (file.size === 0) {
    throw new Error('El archivo seleccionado está vacío (0 bytes).');
  }

  // 2. Validate MIME Type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Tipo de archivo no permitido (${file.type || 'desconocido'}). Solo se admiten imágenes JPG, PNG o WebP.`
    );
  }

  // 3. Early pass if file is already compliant
  if (file.size <= maxSize) {
    const dataUrl = await fileToDataUrl(file);
    return {
      file,
      sizeBytes: file.size,
      dataUrl,
      compressed: false,
    };
  }

  // 4. Over-sized file: Execute Canvas Compression Pipeline
  const originalDataUrl = await fileToDataUrl(file);
  const img = await loadImage(originalDataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('El entorno no soporta renderizado 2D en Canvas.');
  }

  // Calculate constrained initial dimensions (max 1920px)
  const MAX_DIM = 1920;
  let width = img.width;
  let height = img.height;

  if (width > MAX_DIM || height > MAX_DIM) {
    if (width > height) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    } else {
      width = Math.round((width * MAX_DIM) / height);
      height = MAX_DIM;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Iterative quality step-down
  const qualitySteps = [0.85, 0.70, 0.55, 0.40, 0.25];
  let bestBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= maxSize) {
      bestBlob = blob;
      break;
    }
  }

  // Secondary pass: Dimension downscale if still over maxSize
  if (!bestBlob) {
    let scale = 0.75;
    for (let i = 0; i < 2; i++) {
      const scaledCanvas = document.createElement('canvas');
      const sWidth = Math.round(width * scale);
      const sHeight = Math.round(height * scale);
      scaledCanvas.width = sWidth;
      scaledCanvas.height = sHeight;
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(img, 0, 0, sWidth, sHeight);
        const blob = await canvasToBlob(scaledCanvas, 'image/jpeg', 0.5);
        if (blob.size <= maxSize) {
          bestBlob = blob;
          break;
        }
      }
      scale *= 0.75;
    }
  }

  // 5. Strict Rejection Barrier: Must not exceed maxSize
  if (!bestBlob || bestBlob.size > maxSize) {
    throw new Error(
      'La imagen no pudo comprimirse por debajo del límite de 1 MB. Por favor seleccione una imagen más liviana.'
    );
  }

  const compressedDataUrl = await fileToDataUrl(bestBlob);
  return {
    file: bestBlob,
    sizeBytes: bestBlob.size,
    dataUrl: compressedDataUrl,
    compressed: true,
  };
}
