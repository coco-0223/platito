import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateAndCompressImage,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/utils/imageCompression';

// Helper to construct simulated File/Blob
function createMockFile(name: string, size: number, type: string): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe('Image Compression & Validation Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts an image that is already <= 1 MB without compressing it', async () => {
    const smallFileSize = 500 * 1024; // 500 KB
    const file = createMockFile('empanada.jpg', smallFileSize, 'image/jpeg');

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(false);
    expect(result.sizeBytes).toBe(smallFileSize);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
    expect(result.dataUrl).toMatch(/^data:image\/jpeg/);
  });

  it('accepts an image at the exact boundary of 1 MB (1,048,576 bytes)', async () => {
    const exact1MB = 1048576;
    const file = createMockFile('pizza.png', exact1MB, 'image/png');

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(false);
    expect(result.sizeBytes).toBe(exact1MB);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
  });

  it('rejects non-image MIME types immediately', async () => {
    const pdfFile = createMockFile('document.pdf', 200 * 1024, 'application/pdf');
    await expect(validateAndCompressImage(pdfFile)).rejects.toThrow(
      'Tipo de archivo no permitido'
    );

    const txtFile = createMockFile('notes.txt', 10 * 1024, 'text/plain');
    await expect(validateAndCompressImage(txtFile)).rejects.toThrow(
      'Tipo de archivo no permitido'
    );
  });

  it('rejects empty 0-byte image files', async () => {
    const emptyFile = createMockFile('empty.jpg', 0, 'image/jpeg');
    await expect(validateAndCompressImage(emptyFile)).rejects.toThrow(
      'El archivo seleccionado está vacío (0 bytes).'
    );
  });

  it('triggers canvas compression when file size exceeds 1 MB and succeeds', async () => {
    const oversizedSize = 3 * 1024 * 1024; // 3 MB
    const file = createMockFile('milanesa-large.jpg', oversizedSize, 'image/jpeg');

    // Mock Canvas and Image decoding pipeline for Vitest jsdom environment
    const mockCompressedBlob = new Blob([new Uint8Array(800 * 1024)], { type: 'image/jpeg' }); // 800 KB

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const mockCanvas: any = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(mockCompressedBlob),
        };
        return mockCanvas;
      }
      return document.createElement(tag);
    });

    // Mock global Image
    global.Image = class {
      onload: () => void = () => {};
      width: number = 3000;
      height: number = 2000;
      src: string = '';
      constructor() {
        setTimeout(() => this.onload(), 10);
      }
    } as any;

    const result = await validateAndCompressImage(file);

    expect(result.compressed).toBe(true);
    expect(result.sizeBytes).toBe(mockCompressedBlob.size);
    expect(result.sizeBytes).toBeLessThanOrEqual(MAX_IMAGE_SIZE_BYTES);
    expect(result.dataUrl).toBeTruthy();
  });

  it('strictly rejects the image if compression cannot reduce size <= 1 MB', async () => {
    const oversizedSize = 5 * 1024 * 1024; // 5 MB
    const file = createMockFile('huge-panoramic.jpg', oversizedSize, 'image/jpeg');

    // Mock Canvas returning still-oversized blob (> 1 MB)
    const stillTooLargeBlob = new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type: 'image/jpeg' });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        const mockCanvas: any = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: (cb: (b: Blob) => void) => cb(stillTooLargeBlob),
        };
        return mockCanvas;
      }
      return document.createElement(tag);
    });

    global.Image = class {
      onload: () => void = () => {};
      width: number = 4000;
      height: number = 3000;
      src: string = '';
      constructor() {
        setTimeout(() => this.onload(), 10);
      }
    } as any;

    await expect(validateAndCompressImage(file)).rejects.toThrow(
      'La imagen no pudo comprimirse por debajo del límite de 1 MB. Por favor seleccione una imagen más liviana.'
    );
  });
});
