import { isFirebaseConfigured, storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const MAX_IMAGE_SIZE_BYTES = 1048576; // 1 MB (1024 * 1024)

export interface StorageUploadResult {
  downloadUrl: string;
  storagePath: string;
}

export interface IStorageService {
  uploadDishImage(file: File | Blob, dishId: string, customFileName?: string): Promise<StorageUploadResult>;
}

export class StorageService implements IStorageService {
  async uploadDishImage(
    file: File | Blob,
    dishId: string,
    customFileName: string = 'image.jpg'
  ): Promise<StorageUploadResult> {
    // 1. Guard against payload > 1 MB
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `El archivo pesa ${(file.size / 1024 / 1024).toFixed(2)} MB y supera el límite máximo permitido de 1 MB (${MAX_IMAGE_SIZE_BYTES} bytes).`
      );
    }

    // 2. Validate MIME type
    const mimeType = file.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(mimeType)) {
      throw new Error(`Formato de archivo no soportado (${mimeType}). Se admiten JPEG, PNG y WEBP.`);
    }

    // 3. Live Firebase Storage
    if (isFirebaseConfigured() && storage) {
      try {
        const sanitizedFileName = customFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `dishes/${dishId}/${Date.now()}_${sanitizedFileName}`;
        const storageRef = ref(storage, storagePath);

        const snapshot = await uploadBytes(storageRef, file, {
          contentType: mimeType,
          customMetadata: {
            dishId,
            uploadedAt: new Date().toISOString(),
          },
        });

        const downloadUrl = await getDownloadURL(snapshot.ref);
        return {
          downloadUrl,
          storagePath,
        };
      } catch (error: any) {
        console.warn('Firebase Storage upload failed, falling back to local data URL:', error);
      }
    }

    // 4. In-Memory / Local Fallback: Convert to Data URL
    const dataUrl = await this.blobToDataUrl(file);
    const storagePath = `dishes/${dishId}/local_${Date.now()}_${customFileName}`;
    return {
      downloadUrl: dataUrl,
      storagePath,
    };
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Node / test environment fallback
        resolve('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al convertir el archivo a Data URL.'));
      reader.readAsDataURL(blob);
    });
  }
}

export const storageService = new StorageService();
